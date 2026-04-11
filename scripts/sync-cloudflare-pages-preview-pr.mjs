const API_ROOT = "https://api.cloudflare.com/client/v4";
const GITHUB_API_ROOT = "https://api.github.com";
const DEPLOYMENTS_PER_PAGE = 25;
const MAX_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 1000;
const DEPLOYMENT_LOOKUP_ATTEMPTS = 12;
const DEPLOYMENT_LOOKUP_DELAY_MS = 5000;
const REQUEST_TIMEOUT_MS = 15000;
const PREVIEW_BLOCK_START = "<!-- codex-preview-link:start -->";
const PREVIEW_BLOCK_END = "<!-- codex-preview-link:end -->";

const CLOUDFLARE_API_TOKEN =
  process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.CF_ACCOUNT_ID;
const CLOUDFLARE_PAGES_PROJECT =
  process.env.CLOUDFLARE_PAGES_PROJECT ?? process.env.CF_PAGES_PROJECT_NAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_SHA = process.env.GITHUB_SHA;
const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL;
const PR_NUMBER = process.env.PR_NUMBER;
const PR_BRANCH = process.env.PR_BRANCH;
const PREVIEW_URL = process.env.PREVIEW_URL;

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return status === 429 || status >= 500;
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const upstreamSignal = init.signal;

  if (upstreamSignal?.aborted) {
    controller.abort();
  } else if (upstreamSignal) {
    upstreamSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function cloudflareRequest(path, init = {}, attempt = 1) {
  let response;

  try {
    response = await fetchWithTimeout(`${API_ROOT}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        ...(init.headers ?? {})
      }
    });
  } catch (error) {
    if (attempt < MAX_ATTEMPTS) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      console.warn(
        `Cloudflare request failed for ${init.method ?? "GET"} ${path}. Retrying in ${delay}ms (${attempt}/${MAX_ATTEMPTS}).`
      );
      await sleep(delay);
      return cloudflareRequest(path, init, attempt + 1);
    }

    throw error;
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const message =
    body?.errors?.[0]?.message ??
    body?.messages?.[0]?.message ??
    `Cloudflare API request failed with status ${response.status}.`;

  if ((!response.ok || !body?.success) && isRetryableStatus(response.status) && attempt < MAX_ATTEMPTS) {
    const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
    console.warn(
      `Cloudflare request failed for ${init.method ?? "GET"} ${path} (${message}). Retrying in ${delay}ms (${attempt}/${MAX_ATTEMPTS}).`
    );
    await sleep(delay);
    return cloudflareRequest(path, init, attempt + 1);
  }

  if (!response.ok || !body?.success) {
    throw new Error(message);
  }

  return body;
}

async function githubRequest(path, init = {}) {
  const response = await fetchWithTimeout(`${GITHUB_API_ROOT}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {})
    }
  });
  const body = await response.json();

  if (!response.ok) {
    const message =
      body?.message ?? `GitHub API request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return body;
}

function normalizeBranchAlias(branch) {
  return branch.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

function ensureHttps(url) {
  return url.startsWith("http") ? url : `https://${url}`;
}

function getHost(url) {
  return new URL(ensureHttps(url)).host;
}

async function listPreviewDeployments() {
  const deployments = [];

  for (let page = 1; ; page += 1) {
    const params = new URLSearchParams({
      env: "preview",
      page: String(page),
      per_page: String(DEPLOYMENTS_PER_PAGE)
    });

    const body = await cloudflareRequest(
      `/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${CLOUDFLARE_PAGES_PROJECT}/deployments?${params.toString()}`
    );
    const pageResults = Array.isArray(body.result) ? body.result : [];
    deployments.push(...pageResults);

    const totalPages = body.result_info?.total_pages;
    if (pageResults.length < DEPLOYMENTS_PER_PAGE || (typeof totalPages === "number" && page >= totalPages)) {
      return deployments;
    }
  }
}

function sortNewestFirst(left, right) {
  const leftTime = Date.parse(left.modified_on ?? left.created_on ?? "") || 0;
  const rightTime = Date.parse(right.modified_on ?? right.created_on ?? "") || 0;
  return rightTime - leftTime;
}

function selectLatestDeploymentForBranch(deployments, branch) {
  const branchDeployments = deployments
    .filter((deployment) => deployment.deployment_trigger?.metadata?.branch === branch)
    .sort(sortNewestFirst);

  if (!GITHUB_SHA) {
    return branchDeployments[0];
  }

  return branchDeployments.find(
    (deployment) => deployment.deployment_trigger?.metadata?.commit_hash === GITHUB_SHA
  );
}

async function waitForLatestDeployment(branch) {
  for (let attempt = 1; attempt <= DEPLOYMENT_LOOKUP_ATTEMPTS; attempt += 1) {
    const deployments = await listPreviewDeployments();
    const deployment = selectLatestDeploymentForBranch(deployments, branch);
    if (deployment) {
      return deployment;
    }

    if (attempt < DEPLOYMENT_LOOKUP_ATTEMPTS) {
      console.log(
        `Preview deployment for ${branch} is not visible yet. Waiting ${DEPLOYMENT_LOOKUP_DELAY_MS}ms (${attempt}/${DEPLOYMENT_LOOKUP_ATTEMPTS}).`
      );
      await sleep(DEPLOYMENT_LOOKUP_DELAY_MS);
    }
  }

  throw new Error(`No preview deployment found for branch ${branch}.`);
}

function selectPreviewUrl(deployment, branch) {
  const normalizedBranch = normalizeBranchAlias(branch);
  const expectedAlias = `${normalizedBranch}.${CLOUDFLARE_PAGES_PROJECT}.pages.dev`;
  const deploymentHost = deployment.url ? getHost(deployment.url) : null;
  const aliases = (Array.isArray(deployment.aliases) ? deployment.aliases : [])
    .map((alias) => ({
      raw: alias,
      host: getHost(alias)
    }))
    .filter(({ host }) => host.endsWith(`.${CLOUDFLARE_PAGES_PROJECT}.pages.dev`) && host !== deploymentHost)
    .sort((left, right) => left.host.localeCompare(right.host));

  const preferredAlias =
    aliases.find(({ host }) => host === expectedAlias) ??
    aliases.find(({ host }) => host.startsWith(`${normalizedBranch}-`)) ??
    aliases[0];

  if (preferredAlias) {
    return ensureHttps(preferredAlias.raw);
  }

  if (deployment.url) {
    return ensureHttps(deployment.url);
  }

  throw new Error(`Could not determine preview URL for branch ${branch}.`);
}

function renderPreviewBlock(previewUrl, deploymentUrl) {
  const lines = [
    PREVIEW_BLOCK_START,
    "## Preview",
    "",
    `Stable preview: [${previewUrl}](${previewUrl})`
  ];

  if (deploymentUrl && deploymentUrl !== previewUrl) {
    lines.push(`Latest deployment: [${deploymentUrl}](${deploymentUrl})`);
  }

  lines.push(PREVIEW_BLOCK_END);
  return lines.join("\n");
}

function mergePreviewBlock(body, previewBlock) {
  const currentBody = body ?? "";
  const blockPattern = new RegExp(
    `${PREVIEW_BLOCK_START}[\\s\\S]*?${PREVIEW_BLOCK_END}`,
    "m"
  );

  if (blockPattern.test(currentBody)) {
    return currentBody.replace(blockPattern, previewBlock);
  }

  if (!currentBody) {
    return previewBlock;
  }

  const separator = currentBody.endsWith("\n\n")
    ? ""
    : currentBody.endsWith("\n")
      ? "\n"
      : "\n\n";

  return `${currentBody}${separator}${previewBlock}`;
}

async function main() {
  requireEnv("CLOUDFLARE_API_TOKEN", CLOUDFLARE_API_TOKEN);
  requireEnv("CLOUDFLARE_ACCOUNT_ID", CLOUDFLARE_ACCOUNT_ID);
  requireEnv("CLOUDFLARE_PAGES_PROJECT", CLOUDFLARE_PAGES_PROJECT);
  requireEnv("GITHUB_TOKEN", GITHUB_TOKEN);
  requireEnv("GITHUB_REPOSITORY", GITHUB_REPOSITORY);
  requireEnv("PR_NUMBER", PR_NUMBER);
  requireEnv("PR_BRANCH", PR_BRANCH);

  const outputPreviewUrl = PREVIEW_URL ? ensureHttps(PREVIEW_URL) : null;
  const outputDeploymentUrl = DEPLOYMENT_URL ? ensureHttps(DEPLOYMENT_URL) : null;

  let previewUrl = outputPreviewUrl;
  let deploymentUrl = outputDeploymentUrl;

  if (!previewUrl) {
    const deployment = await waitForLatestDeployment(PR_BRANCH);
    previewUrl = selectPreviewUrl(deployment, PR_BRANCH);
    deploymentUrl = deployment.url ? ensureHttps(deployment.url) : deploymentUrl;
  }

  const pullRequest = await githubRequest(
    `/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}`
  );
  const nextBody = mergePreviewBlock(
    pullRequest.body,
    renderPreviewBlock(previewUrl, deploymentUrl)
  );

  if (nextBody === (pullRequest.body ?? "")) {
    console.log(`PR #${PR_NUMBER} preview block is already up to date.`);
    return;
  }

  await githubRequest(`/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      body: nextBody
    })
  });

  console.log(`Updated PR #${PR_NUMBER} with preview URL ${previewUrl}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
