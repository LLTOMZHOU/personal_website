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
  const closeButton = lightboxRoot.querySelector("[data-gallery-lightbox-close]");

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
  let activeRequestId = 0;
  const imageLoadPromises = new Map<string, Promise<void>>();

  const scheduleIdleWork =
    "requestIdleCallback" in window
      ? window.requestIdleCallback.bind(window)
      : (callback: IdleRequestCallback) =>
          window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline), 250);

  function loadImageSource(source: string | null | undefined) {
    if (!source) {
      return Promise.resolve();
    }

    const existingPromise = imageLoadPromises.get(source);

    if (existingPromise) {
      return existingPromise;
    }

    const loadPromise = new Promise<void>((resolve, reject) => {
      const preload = new Image();
      preload.decoding = "async";

      const finalize = async () => {
        try {
          if (typeof preload.decode === "function") {
            await preload.decode();
          }
        } catch {
          // Ignore decode races for already-loaded images.
        }

        resolve();
      };

      preload.addEventListener(
        "load",
        () => {
          void finalize();
        },
        { once: true }
      );
      preload.addEventListener(
        "error",
        () => {
          imageLoadPromises.delete(source);
          reject(new Error(`Failed to load gallery image: ${source}`));
        },
        { once: true }
      );
      preload.src = source;

      if (preload.complete && preload.naturalWidth > 0) {
        void finalize();
      }
    });

    imageLoadPromises.set(source, loadPromise);
    return loadPromise;
  }

  function prefetchImageSource(source: string | null | undefined) {
    void loadImageSource(source).catch(() => {
      // Ignore background prefetch failures; the lightbox will retry on demand.
    });
  }

  function triggerSource(index: number) {
    return triggerButtons[index]?.dataset.galleryImageSrc ?? "";
  }

  function prefetchAdjacentImages(index: number) {
    if (triggerButtons.length < 2) {
      return;
    }

    const nextIndex = (index + 1) % triggerButtons.length;
    const previousIndex = (index - 1 + triggerButtons.length) % triggerButtons.length;
    prefetchImageSource(triggerSource(nextIndex));
    prefetchImageSource(triggerSource(previousIndex));
  }

  function focusableLightboxElements() {
    return Array.from(
      lightbox.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hidden && !element.hasAttribute("disabled"));
  }

  async function setActiveImage(index: number, options: { preferPreview?: boolean } = {}) {
    const trigger = triggerButtons[index];

    if (!trigger) {
      return;
    }

    const fullSource = trigger.dataset.galleryImageSrc ?? "";
    const previewSource = trigger.dataset.galleryImagePreviewSrc ?? fullSource;
    const alt = trigger.dataset.galleryImageAlt ?? "";
    const requestId = ++activeRequestId;

    if (options.preferPreview && previewSource) {
      lightboxImage.src = previewSource;
    }

    lightboxImage.alt = alt;
    lightboxStatus.textContent = `${index + 1} / ${triggerButtons.length}`;

    lightboxCaption.textContent = "";
    lightboxCaption.hidden = true;
    activeIndex = index;
    prefetchAdjacentImages(index);

    if (!fullSource) {
      lightbox.setAttribute("aria-busy", "false");
      return;
    }

    lightbox.setAttribute("aria-busy", "true");

    try {
      await loadImageSource(fullSource);
    } catch (error) {
      if (requestId === activeRequestId) {
        lightbox.setAttribute("aria-busy", "false");
      }

      console.error(error);
      return;
    }

    if (requestId !== activeRequestId) {
      return;
    }

    lightboxImage.src = fullSource;
    lightboxImage.alt = alt;
    lightbox.setAttribute("aria-busy", "false");
  }

  function openLightbox(index: number) {
    void setActiveImage(index, { preferPreview: true });
    lightbox.hidden = false;
    lightbox.classList.remove("hidden");
    lightbox.classList.add("flex");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("overflow-hidden");
    window.requestAnimationFrame(() => {
      if (closeButton instanceof HTMLButtonElement) {
        closeButton.focus();
        return;
      }

      focusableLightboxElements()[0]?.focus();
    });
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
    void setActiveImage(nextIndex);
  }

  triggerButtons.forEach((trigger, index) => {
    const prefetchCurrentImage = () => {
      prefetchImageSource(trigger.dataset.galleryImageSrc);
    };

    trigger.addEventListener("pointerenter", prefetchCurrentImage, { passive: true });
    trigger.addEventListener("focus", prefetchCurrentImage);
    trigger.addEventListener("touchstart", prefetchCurrentImage, { passive: true });
    trigger.addEventListener("click", () => {
      openLightbox(index);
    });
  });

  scheduleIdleWork(() => {
    prefetchImageSource(triggerSource(0));
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

    if (event.key === "Tab") {
      const focusableElements = focusableLightboxElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      const direction = event.shiftKey ? -1 : 1;
      const nextIndex =
        currentIndex === -1
          ? (event.shiftKey ? focusableElements.length - 1 : 0)
          : (currentIndex + direction + focusableElements.length) % focusableElements.length;

      event.preventDefault();
      focusableElements[nextIndex]?.focus();
    }
  });
}

setupNav();
setupPlaceholderForms();
setupAssistant();
setupPhotographyLightbox();
