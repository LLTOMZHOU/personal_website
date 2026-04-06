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

  let loaded = false;

  async function toggleAssistant() {
    const expanded = triggers[0]?.getAttribute("aria-expanded") === "true";

    for (const trigger of triggers) {
      if (trigger instanceof HTMLElement) {
        trigger.setAttribute("aria-expanded", String(!expanded));
      }
    }

    panel.hidden = expanded;
    panel.classList.toggle("hidden", expanded);

    if (!expanded && !loaded) {
      const moduleSrc = panel.dataset.assistantSrc;
      if (moduleSrc) {
        await import(/* @vite-ignore */ moduleSrc);
        loaded = true;
      }
    }
  }

  for (const trigger of triggers) {
    trigger.addEventListener("click", async () => {
      await toggleAssistant();
    });
  }

  document.addEventListener("keydown", async (event) => {
    if (event.key === "/" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
      await toggleAssistant();
    }
  });
}

setupNav();
setupAssistant();
