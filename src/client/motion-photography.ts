import { animate, stagger } from "animejs";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function collectRevealTargets(section: HTMLElement) {
  const explicitTargets = Array.from(section.querySelectorAll<HTMLElement>("[data-photography-item]"));

  if (explicitTargets.length > 0) {
    return explicitTargets;
  }

  const directChildren = Array.from(section.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  );

  return directChildren.length > 0 ? directChildren : [section];
}

function setupPhotographyReveal() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-photography-reveal]"));

  if (sections.length === 0) {
    return;
  }

  if (prefersReducedMotion()) {
    sections.forEach((section) => {
      collectRevealTargets(section).forEach((target) => {
        target.dataset.motionRevealed = "true";
        target.style.opacity = "1";
        target.style.transform = "none";
      });
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!(entry.target instanceof HTMLElement) || !entry.isIntersecting) {
          return;
        }

        const section = entry.target;

        if (section.dataset.photographyRevealState === "revealed") {
          observer.unobserve(section);
          return;
        }

        section.dataset.photographyRevealState = "revealed";
        const targets = collectRevealTargets(section);
        animate(targets, {
          opacity: [0, 1],
          y: [28, 0],
          delay: stagger(120),
          duration: 920,
          ease: "out(4)",
          onComplete: () => {
            targets.forEach((target) => {
              target.dataset.motionRevealed = "true";
            });
          }
        });

        observer.unobserve(section);
      });
    },
    { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
  );
  sections.forEach((section) => {
    observer.observe(section);
  });
}

function setupGalleryLightboxMotion() {
  const lightbox = document.querySelector<HTMLElement>("[data-gallery-lightbox]");
  const panel = lightbox?.querySelector<HTMLElement>("[data-gallery-lightbox-panel]");
  const image = lightbox?.querySelector<HTMLImageElement>("[data-gallery-lightbox-image]");

  if (!(lightbox instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
    return;
  }

  if (prefersReducedMotion()) {
    return;
  }

  let lastAnimatedImageSrc = "";

  lightbox.addEventListener("gallery-lightbox-open", () => {
    animate(lightbox, { opacity: [0, 1], duration: 180, ease: "out(2)" });
    animate(panel, { opacity: [0, 1], y: [10, 0], duration: 260, ease: "out(3)" });
  });

  lightbox.addEventListener("gallery-lightbox-before-close", (event) => {
    const customEvent = event as CustomEvent<{ waitUntil: (promise: Promise<unknown>) => void }>;
    const fadeOut = Promise.allSettled([
      lightbox
        .animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 140,
          easing: "ease-out",
          fill: "forwards"
        })
        .finished,
      panel
        .animate([{ opacity: 1, transform: "translateY(0px)" }, { opacity: 0, transform: "translateY(12px)" }], {
          duration: 200,
          easing: "cubic-bezier(0.33, 1, 0.68, 1)",
          fill: "forwards"
        })
        .finished
    ]).then(() => {
      lightbox.style.opacity = "";
      panel.style.opacity = "";
      panel.style.transform = "";
    });

    customEvent.detail.waitUntil(fadeOut);
  });

  if (image instanceof HTMLImageElement) {
    image.addEventListener("load", () => {
      const currentImageSrc = image.currentSrc || image.src;

      if (!currentImageSrc || currentImageSrc === lastAnimatedImageSrc) {
        return;
      }

      lastAnimatedImageSrc = currentImageSrc;
      animate(image, { opacity: [0.1, 1], scale: [0.992, 1], duration: 200, ease: "out(2)" });
    });
  }
}

setupPhotographyReveal();
setupGalleryLightboxMotion();
