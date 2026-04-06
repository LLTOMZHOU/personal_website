import "../styles/global.css";

function setupNav() {
  const nav = document.querySelector("[data-site-nav]");
  const toggle = nav?.querySelector("[data-nav-toggle]");
  const navLinks = document.querySelector("#primary-nav");

  if (!(toggle instanceof HTMLButtonElement) || !(navLinks instanceof HTMLElement)) {
    return;
  }

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    navLinks.classList.toggle("hidden", expanded);
    navLinks.classList.toggle("flex", !expanded);
  });
}

async function setupAssistant() {
  const triggers = document.querySelectorAll("[data-assistant-trigger]");
  const panel = document.querySelector("[data-assistant-panel]");

  if (!(panel instanceof HTMLElement) || triggers.length === 0) {
    return;
  }

  const panelElement = panel;
  let loaded = false;
  let importFailed = false;

  async function toggleAssistant() {
    const expanded = triggers[0]?.getAttribute("aria-expanded") === "true";

    for (const trigger of triggers) {
      if (trigger instanceof HTMLElement) {
        trigger.setAttribute("aria-expanded", String(!expanded));
      }
    }

    panelElement.hidden = expanded;
    panelElement.classList.toggle("hidden", expanded);

    if (!expanded && !loaded && !importFailed) {
      const moduleSrc = panelElement.dataset.assistantSrc;
      if (moduleSrc) {
        try {
          await import(/* @vite-ignore */ moduleSrc);
          loaded = true;
        } catch (error) {
          importFailed = true;
          console.error("Failed to load assistant module:", error);
          const root = panelElement.querySelector("#assistant-root");

          if (root instanceof HTMLElement) {
            root.innerHTML =
              '<p class="font-body text-sm leading-7 text-text-muted">Assistant is temporarily unavailable.</p>';
          }
        }
      }
    }
  }

  for (const trigger of triggers) {
    trigger.addEventListener("click", async () => {
      await toggleAssistant();
    });
  }

  document.addEventListener("keydown", async (event) => {
    const target = event.target;
    const isTypingTarget =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          target.closest("[contenteditable]") instanceof HTMLElement ||
          target.getAttribute("role") === "textbox"
        ));

    if (event.key === "/" && !isTypingTarget) {
      event.preventDefault();
      await toggleAssistant();
    }
  });
}

setupNav();
setupAssistant();
