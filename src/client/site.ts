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

function setupPlaceholderForms() {
  const forms = document.querySelectorAll("[data-placeholder-form]");

  for (const form of forms) {
    if (!(form instanceof HTMLFormElement)) {
      continue;
    }

    const status = form.querySelector("[data-form-status]");

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (status instanceof HTMLElement) {
        status.textContent = "Newsletter signup is not wired up yet.";
      }
    });
  }
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

function setupPhotographyLightbox() {
  const triggers = Array.from(document.querySelectorAll("[data-gallery-image-trigger]"));
  const lightboxRoot = document.querySelector("[data-gallery-lightbox]");

  if (
    !(lightboxRoot instanceof HTMLElement) ||
    triggers.length === 0
  ) {
    return;
  }

  const image = lightboxRoot.querySelector("[data-gallery-lightbox-image]");
  const caption = lightboxRoot.querySelector("[data-gallery-lightbox-caption]");
  const status = lightboxRoot.querySelector("[data-gallery-lightbox-status]");
  const closeButtons = lightboxRoot.querySelectorAll("[data-gallery-lightbox-close], [data-gallery-lightbox-backdrop]");
  const prevButton = lightboxRoot.querySelector("[data-gallery-lightbox-prev]");
  const nextButton = lightboxRoot.querySelector("[data-gallery-lightbox-next]");

  if (
    !(image instanceof HTMLImageElement) ||
    !(caption instanceof HTMLElement) ||
    !(status instanceof HTMLElement)
  ) {
    return;
  }

  const lightbox = lightboxRoot;
  const lightboxImage = image;
  const lightboxCaption = caption;
  const lightboxStatus = status;
  const triggerButtons = triggers.filter((trigger): trigger is HTMLButtonElement => trigger instanceof HTMLButtonElement);
  let activeIndex = -1;

  function setActiveImage(index: number) {
    const trigger = triggerButtons[index];

    if (!trigger) {
      return;
    }

    lightboxImage.src = trigger.dataset.galleryImageSrc ?? "";
    lightboxImage.alt = trigger.dataset.galleryImageAlt ?? "";
    lightboxCaption.textContent = trigger.dataset.galleryImageAlt ?? "";
    lightboxStatus.textContent = `${index + 1} / ${triggerButtons.length}`;
    activeIndex = index;
  }

  function openLightbox(index: number) {
    setActiveImage(index);
    lightbox.hidden = false;
    lightbox.classList.remove("hidden");
    lightbox.classList.add("flex");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("overflow-hidden");
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightbox.classList.add("hidden");
    lightbox.classList.remove("flex");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("overflow-hidden");

    if (activeIndex >= 0) {
      triggerButtons[activeIndex]?.focus();
    }

    activeIndex = -1;
  }

  function moveLightbox(direction: number) {
    if (activeIndex < 0) {
      return;
    }

    const nextIndex = (activeIndex + direction + triggerButtons.length) % triggerButtons.length;
    setActiveImage(nextIndex);
  }

  triggerButtons.forEach((trigger, index) => {
    trigger.addEventListener("click", () => {
      openLightbox(index);
    });
  });

  closeButtons?.forEach((button) => {
    if (button instanceof HTMLButtonElement) {
      button.addEventListener("click", () => {
        closeLightbox();
      });
    }
  });

  if (prevButton instanceof HTMLButtonElement) {
    prevButton.addEventListener("click", () => {
      moveLightbox(-1);
    });
  }

  if (nextButton instanceof HTMLButtonElement) {
    nextButton.addEventListener("click", () => {
      moveLightbox(1);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (activeIndex < 0) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveLightbox(1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveLightbox(-1);
    }
  });
}

setupNav();
setupPlaceholderForms();
setupAssistant();
setupPhotographyLightbox();
