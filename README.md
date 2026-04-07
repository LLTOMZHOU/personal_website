# Personal Site

This repository builds a static site with a custom build script (`pnpm build`) and deploys the generated `dist/` output.

## Cloudflare Pages deployment (GitHub Actions)

A GitHub Actions workflow is included at:

- `.github/workflows/deploy-cloudflare-pages.yml`

The workflow runs on pull requests to `main` (build-only validation), pushes to `main`, and on manual dispatch.

### Required GitHub repository variables

Set these in **Settings → Secrets and variables → Actions → Variables**:

- `SITE_URL` (for build metadata, e.g. `https://your-domain.com`)
- `CLOUDFLARE_PAGES_PROJECT` (Cloudflare Pages project name)
- `CLOUDFLARE_ACCOUNT_ID`

### Required GitHub repository secrets

Set these in **Settings → Secrets and variables → Actions → Secrets**:

- `CLOUDFLARE_API_TOKEN`

The workflow builds with `pnpm build` and deploys `dist/` via `wrangler pages deploy`.
