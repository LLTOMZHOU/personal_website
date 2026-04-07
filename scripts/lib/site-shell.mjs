const NAV_ITEMS = [
  { href: "/projects/", label: "Projects", section: "projects" },
  { href: "/writing/", label: "Writing", section: "writing" },
  { href: "/photography/", label: "Photography", section: "photography" },
  { href: "/ai-media/", label: "AI-Generated Media", section: "ai-media" },
  { href: "/about/", label: "About", section: "about" }
];
const RSS_FEED_URL = "/rss.xml";
const SOURCE_REPO_URL = "https://github.com/LLTOMZHOU/personal_website";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function renderNav(section) {
  const links = NAV_ITEMS.map((item) => {
    const current = item.section === section ? ' aria-current="page"' : "";
    const currentClass =
      item.section === section
        ? "nav-link-base text-primary nav-link-current"
        : "nav-link-base text-text-main/60 transition-colors hover:text-primary";

    return `<a class="${currentClass}" href="${item.href}"${current}>${item.label}</a>`;
  }).join("");

  return `
    <nav
      class="fixed top-0 z-50 w-full border-b border-text-main/5 bg-surface/80 backdrop-blur-md"
      aria-label="Primary"
      data-site-nav
    >
      <div class="mx-auto flex max-w-screen-2xl items-center justify-between px-8 py-6 md:flex md:items-center md:gap-10 md:px-16">
        <a class="headline-bold inline-flex h-10 shrink-0 items-center text-2xl text-text-main" href="/">Yuxing Zhou</a>
        <button
          class="font-body text-[0.7rem] font-bold uppercase tracking-[0.2em] text-text-main md:hidden"
          type="button"
          aria-expanded="false"
          aria-controls="primary-nav"
          data-nav-toggle
        >
          Menu
        </button>
        <div
          class="absolute left-8 right-8 top-full hidden flex-col gap-5 border-b border-text-main/5 bg-surface/95 py-5 font-headline text-[0.8rem] font-bold uppercase tracking-[0.2em] md:static md:flex md:h-10 md:flex-1 md:flex-row md:items-center md:justify-center md:gap-10 md:border-0 md:bg-transparent md:py-0"
          id="primary-nav"
        >
          ${links}
        </div>
        <button
          class="hidden h-10 shrink-0 items-center border border-text-main/20 px-6 font-body text-[0.7rem] font-bold uppercase tracking-[0.2em] transition-all hover:border-primary hover:bg-primary hover:text-white md:inline-flex"
          type="button"
          aria-expanded="false"
          aria-controls="assistant-panel"
          data-assistant-trigger
        >
          Summon AI
        </button>
      </div>
    </nav>
  `;
}

function renderFooter() {
  const year = new Date().getFullYear();

  return `
    <footer class="mt-32 w-full border-t border-text-main/10 bg-surface py-16">
      <div class="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-8 px-12 md:flex-row">
        <p class="font-body text-[0.8rem] tracking-tight text-text-muted">
          © ${year} Yuxing Zhou. Built for permanence.
        </p>
        <div class="flex gap-16">
          <a class="font-body text-[0.8rem] text-text-muted transition-colors hover:text-primary" href="/about/">
            Colophon
          </a>
          <a class="font-body text-[0.8rem] text-text-muted transition-colors hover:text-primary" href="${RSS_FEED_URL}">
            RSS
          </a>
          <a class="font-body text-[0.8rem] text-text-muted transition-colors hover:text-primary" href="${SOURCE_REPO_URL}">
            Source
          </a>
        </div>
      </div>
    </footer>
  `;
}

function renderFloatingAssistant() {
  return `
    <div class="fixed bottom-12 right-12 z-50 group">
      <button
        class="flex h-16 w-16 cursor-pointer items-center justify-center bg-text-main text-white shadow-2xl transition-all hover:bg-primary"
        type="button"
        aria-label="Open assistant"
        aria-expanded="false"
        aria-controls="assistant-panel"
        data-assistant-trigger
      >
        <span aria-hidden="true" class="material-symbols-outlined text-3xl">terminal</span>
      </button>
      <div
        class="assistant-tooltip pointer-events-none absolute bottom-full right-0 mb-6 whitespace-nowrap px-5 py-3 text-[0.7rem] font-bold uppercase tracking-widest opacity-0 shadow-xl transition-opacity group-hover:opacity-100"
      >
        Press <span>/</span> to command assistant
      </div>
    </div>
  `;
}

function renderAssistantShell(assistantSrc) {
  const assistantSource = assistantSrc ? escapeAttr(assistantSrc) : "";

  return `
    <section
      class="fixed inset-x-6 top-28 z-40 mx-auto hidden max-w-3xl"
      id="assistant-panel"
      hidden
      aria-live="polite"
      data-assistant-panel
      data-assistant-src="${assistantSource}"
    >
      <div class="border border-text-main/10 bg-surface px-6 py-5 shadow-2xl shadow-text-main/10 md:px-8">
        <p class="mb-4 font-body text-[0.7rem] font-bold uppercase tracking-[0.2em] text-primary">Assistant</p>
        <div id="assistant-root">
          <p class="font-body text-sm leading-7 text-text-muted">
            Ask about projects, writing, photography, or where to navigate next.
          </p>
        </div>
      </div>
    </section>
  `;
}

function renderCssLinks(cssFiles) {
  return cssFiles.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n");
}

function renderScriptTags(scriptFiles) {
  return scriptFiles.map((src) => `<script type="module" src="${src}"></script>`).join("\n");
}

export function renderPage({
  siteUrl,
  metadata,
  bodyHtml,
  cssFiles,
  scriptFiles,
  assistantSrc = null
}) {
  const canonicalUrl = metadata.canonicalUrl ?? new URL(metadata.path, siteUrl).toString();
  const title = escapeHtml(`${metadata.title} | Yuxing Zhou`);
  const description = escapeAttr(metadata.description);
  const escapedCanonicalUrl = escapeAttr(canonicalUrl);
  const ogImage = metadata.ogImage ? escapeAttr(metadata.ogImage) : "";
  const bodyClass = metadata.bodyClass ? ` ${escapeAttr(metadata.bodyClass)}` : "";
  const section = escapeAttr(metadata.section);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${escapedCanonicalUrl}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&family=Newsreader:ital,wght@0,400;0,700;0,800;1,400;1,700;1,800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
    >
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapedCanonicalUrl}">
    ${metadata.ogImage ? `<meta property="og:image" content="${ogImage}">` : ""}
    ${metadata.noIndex ? '<meta name="robots" content="noindex, nofollow">' : ""}
    ${renderCssLinks(cssFiles)}
  </head>
  <body class="bg-surface text-text-main antialiased${bodyClass}" data-section="${section}">
    ${renderNav(metadata.section)}
    ${renderAssistantShell(assistantSrc)}
    <main class="mx-auto max-w-screen-2xl px-6 pt-48 md:px-12 lg:px-24">
      ${bodyHtml}
    </main>
    ${renderFooter()}
    ${renderFloatingAssistant()}
    ${renderScriptTags(scriptFiles)}
  </body>
</html>`;
}
