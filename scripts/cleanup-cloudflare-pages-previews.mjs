const API_ROOT = "https://api.cloudflare.com/client/v4";
const DEPLOYMENTS_PER_PAGE = 100;
const MAX_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 1000;
const DELETE_DELAY_MS = 250;

const CLOUDFLARE_API_TOKEN =
  process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.CF_ACCOUNT_ID;
const CLOUDFLARE_PAGES_PROJECT =
  process.env.CLOUDFLARE_PAGES_PROJECT ?? process.env.CF_PAGES_PROJECT_NAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

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

async function apiRequest(path, init = {}, attempt = 1) {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      ...(init.headers ?? {})
    }
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const errorMessage =
    body?.errors?.[0]?.message ??
    body?.messages?.[0]?.message ??
    `Cloudflare API request failed with status ${response.status}.`;

  if ((!response.ok || !body?.success) && isRetryableStatus(response.status) && attempt < MAX_ATTEMPTS) {
    const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
    console.warn(
      `Request failed for ${init.method ?? "GET"} ${path} (${errorMessage}). Retrying in ${delay}ms (${attempt}/${MAX_ATTEMPTS}).`
    );
    await sleep(delay);
    return apiRequest(path, init, attempt + 1);
  }

  if (!response.ok || !body?.success) {
    throw new Error(errorMessage);
  }

  return body;
}

async function githubRequest(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status ${response.status}.`);
  }

  return response.json();
}

async function listPreviewDeployments() {
  const deployments = [];

  for (let page = 1; ; page += 1) {
    const params = new URLSearchParams({
      env: "preview",
      page: String(page),
      per_page: String(DEPLOYMENTS_PER_PAGE)
    });
    const body = await apiRequest(
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

async function deleteDeployment(deployment) {
  const params = new URLSearchParams({ force: "true" });
  await apiRequest(
    `/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${CLOUDFLARE_PAGES_PROJECT}/deployments/${deployment.id}?${params.toString()}`,
    { method: "DELETE" }
  );
}

async function listOpenPullRequestBranches() {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    console.warn("GitHub context is missing. Preview cleanup will not preserve open PR branches.");
    return new Set();
  }

  const branches = new Set();

  for (let page = 1; ; page += 1) {
    const pulls = await githubRequest(
      `/repos/${GITHUB_REPOSITORY}/pulls?state=open&per_page=100&page=${page}`
    );

    if (!Array.isArray(pulls) || pulls.length === 0) {
      return branches;
    }

    for (const pull of pulls) {
      const branch = pull?.head?.ref;
      if (branch) {
        branches.add(branch);
      }
    }

    if (pulls.length < 100) {
      return branches;
    }
  }
}

async function main() {
  requireEnv("CLOUDFLARE_API_TOKEN", CLOUDFLARE_API_TOKEN);
  requireEnv("CLOUDFLARE_ACCOUNT_ID", CLOUDFLARE_ACCOUNT_ID);
  requireEnv("CLOUDFLARE_PAGES_PROJECT", CLOUDFLARE_PAGES_PROJECT);

  const deployments = await listPreviewDeployments();
  if (deployments.length === 0) {
    console.log("No preview deployments found.");
    return;
  }

  const openPullRequestBranches = await listOpenPullRequestBranches();

  deployments.sort((left, right) => {
    const leftTime = Date.parse(left.created_on ?? "") || 0;
    const rightTime = Date.parse(right.created_on ?? "") || 0;
    return leftTime - rightTime;
  });

  console.log(
    `Deleting ${deployments.length} preview deployment${deployments.length === 1 ? "" : "s"} from ${CLOUDFLARE_PAGES_PROJECT}.`
  );

  const failures = [];

  for (const deployment of deployments) {
    const branch = deployment.deployment_trigger?.metadata?.branch ?? "unknown-branch";
    const alias = deployment.aliases?.[0] ?? deployment.url ?? "unknown-url";
    if (openPullRequestBranches.has(branch)) {
      console.log(`Keeping preview ${deployment.id} for open PR branch ${branch}.`);
      continue;
    }

    try {
      await deleteDeployment(deployment);
      console.log(`Deleted preview ${deployment.id} (${branch}) ${alias}`);
      await sleep(DELETE_DELAY_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ id: deployment.id, branch, message });
      console.warn(`Failed to delete preview ${deployment.id} (${branch}): ${message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Failed to delete ${failures.length} preview deployment${failures.length === 1 ? "" : "s"}.`
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
