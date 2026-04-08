function setupPhotographyLightbox() {
  const triggers = Array.from(document.querySelectorAll("[data-gallery-image-trigger]"));
  const lightboxRoot = document.querySelector("[data-gallery-lightbox]");

  if (!(lightboxRoot instanceof HTMLElement) || triggers.length === 0) {
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
  let displayedIndex = -1;
  let requestedIndex = -1;
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

  function renderDisplayedImage(index: number, source: string, alt: string) {
    lightboxImage.src = source;
    lightboxImage.alt = alt;
    lightboxStatus.textContent = `${index + 1} / ${triggerButtons.length}`;
    lightboxCaption.textContent = "";
    lightboxCaption.hidden = true;
    displayedIndex = index;
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
    requestedIndex = index;
    prefetchAdjacentImages(index);

    if (options.preferPreview && previewSource) {
      renderDisplayedImage(index, previewSource, alt);
    }

    if (!fullSource) {
      if (requestId === activeRequestId) {
        requestedIndex = displayedIndex;
        lightbox.setAttribute("aria-busy", "false");
      }

      return;
    }

    lightbox.setAttribute("aria-busy", "true");

    try {
      await loadImageSource(fullSource);
    } catch (error) {
      if (requestId === activeRequestId) {
        requestedIndex = displayedIndex;
        lightbox.setAttribute("aria-busy", "false");
      }

      console.error(error);
      return;
    }

    if (requestId !== activeRequestId) {
      return;
    }

    renderDisplayedImage(index, fullSource, alt);
    requestedIndex = index;
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
    activeRequestId += 1;
    lightbox.hidden = true;
    lightbox.classList.add("hidden");
    lightbox.classList.remove("flex");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.setAttribute("aria-busy", "false");
    document.body.classList.remove("overflow-hidden");

    if (displayedIndex >= 0) {
      triggerButtons[displayedIndex]?.focus();
    }

    displayedIndex = -1;
    requestedIndex = -1;
  }

  function moveLightbox(direction: number) {
    const baseIndex = requestedIndex >= 0 ? requestedIndex : displayedIndex;

    if (baseIndex < 0) {
      return;
    }

    const nextIndex = (baseIndex + direction + triggerButtons.length) % triggerButtons.length;
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
    if (displayedIndex < 0 && requestedIndex < 0) {
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

setupPhotographyLightbox();
