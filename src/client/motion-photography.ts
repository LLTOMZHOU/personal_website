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
          ease: "out(4)"
        });

        observer.unobserve(section);
      });
    },
    { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
  );

  sections.forEach((section) => {
    collectRevealTargets(section).forEach((target) => {
      target.style.opacity = "0";
      target.style.transform = "translateY(28px)";
    });
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

  const observer = new MutationObserver(() => {
    if (lightbox.hidden) {
      return;
    }

    animate(lightbox, { opacity: [0, 1], duration: 180, ease: "out(2)" });
    animate(panel, { opacity: [0, 1], y: [10, 0], duration: 260, ease: "out(3)" });
  });

  observer.observe(lightbox, { attributes: true, attributeFilter: ["hidden"] });

  if (image instanceof HTMLImageElement) {
    image.addEventListener("load", () => {
      animate(image, { opacity: [0.1, 1], scale: [0.992, 1], duration: 200, ease: "out(2)" });
    });
  }
}

setupPhotographyReveal();
setupGalleryLightboxMotion();
