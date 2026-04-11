const API_ROOT = "https://api.cloudflare.com/client/v4";
const DEPLOYMENTS_PER_PAGE = 25;
const MAX_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 1000;
const DELETE_DELAY_MS = 250;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

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
  let response;

  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        ...(init.headers ?? {})
      }
    });
  } catch (error) {
    if (attempt < MAX_ATTEMPTS) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Request failed for ${init.method ?? "GET"} ${path} (${message}). Retrying in ${delay}ms (${attempt}/${MAX_ATTEMPTS}).`
      );
      await sleep(delay);
      return apiRequest(path, init, attempt + 1);
    }

    throw error;
  }

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

async function githubRequest(path, attempt = 1) {
  let response;

  try {
    response = await fetch(`https://api.github.com${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
  } catch (error) {
    if (attempt < MAX_ATTEMPTS) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `GitHub request failed for ${path} (${message}). Retrying in ${delay}ms (${attempt}/${MAX_ATTEMPTS}).`
      );
      await sleep(delay);
      return githubRequest(path, attempt + 1);
    }

    throw error;
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const errorMessage =
    body?.message ?? `GitHub API request failed with status ${response.status}.`;
  const isGitHubRateLimit =
    response.status === 403 &&
    (response.headers.get("x-ratelimit-remaining") === "0" ||
      response.headers.has("retry-after") ||
      body?.message?.toLowerCase().includes("secondary rate limit"));

  const retryDelayMs = getGitHubRetryDelayMs(response);

  if (!response.ok && (isRetryableStatus(response.status) || isGitHubRateLimit) && attempt < MAX_ATTEMPTS) {
    const delay = retryDelayMs ?? RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
    console.warn(
      `GitHub request failed for ${path} (${errorMessage}). Retrying in ${delay}ms (${attempt}/${MAX_ATTEMPTS}).`
    );
    await sleep(delay);
    return githubRequest(path, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return body;
}

function getGitHubRetryDelayMs(response) {
  const retryAfterSeconds = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, MAX_RETRY_DELAY_MS);
  }

  const resetAtSeconds = Number(response.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(resetAtSeconds) && resetAtSeconds > 0) {
    return Math.min(Math.max(0, resetAtSeconds * 1000 - Date.now()), MAX_RETRY_DELAY_MS);
  }

  return null;
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
      const repository = pull?.head?.repo?.full_name;
      if (branch && repository === GITHUB_REPOSITORY) {
        branches.add(branch);
      }
    }

    if (pulls.length < 100) {
      return branches;
    }
  }
}

function deploymentTimestamp(deployment) {
  return Date.parse(deployment.modified_on ?? deployment.created_on ?? "") || 0;
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

  requireEnv("GITHUB_TOKEN", GITHUB_TOKEN);
  requireEnv("GITHUB_REPOSITORY", GITHUB_REPOSITORY);

  const openPullRequestBranches = await listOpenPullRequestBranches();
  const preservedBranches = new Set();
  const preservedDeploymentIds = new Set();

  [...deployments]
    .sort((left, right) => deploymentTimestamp(right) - deploymentTimestamp(left))
    .forEach((deployment) => {
      const branch = deployment.deployment_trigger?.metadata?.branch;
      if (!branch || !openPullRequestBranches.has(branch) || preservedBranches.has(branch)) {
        return;
      }
      preservedBranches.add(branch);
      preservedDeploymentIds.add(deployment.id);
    });

  const deploymentsToDelete = [...deployments]
    .filter((deployment) => !preservedDeploymentIds.has(deployment.id))
    .sort((left, right) => deploymentTimestamp(left) - deploymentTimestamp(right));

  const preservedCount = deployments.length - deploymentsToDelete.length;

  console.log(
    `Found ${deployments.length} preview deployment${deployments.length === 1 ? "" : "s"} in ${CLOUDFLARE_PAGES_PROJECT}; deleting ${deploymentsToDelete.length} and preserving ${preservedCount}.`
  );

  const failures = [];

  for (const deployment of deploymentsToDelete) {
    const branch = deployment.deployment_trigger?.metadata?.branch ?? "unknown-branch";
    const alias = deployment.aliases?.[0] ?? deployment.url ?? "unknown-url";

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
