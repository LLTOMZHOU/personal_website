import { animate, createTimeline, stagger } from "animejs";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setupPhotographyReveal() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-photography-reveal]"));

  if (sections.length === 0) {
    return;
  }

  if (prefersReducedMotion()) {
    sections.forEach((section) => {
      section.style.opacity = "1";
      section.style.transform = "none";
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
        const children = section.querySelectorAll("[data-photography-item]");
        const timeline = createTimeline({ defaults: { duration: 620, ease: "out(3)" } });
        timeline.add(section, { opacity: [0, 1], y: [22, 0] });

        if (children.length > 0) {
          timeline.add(children, { opacity: [0, 1], y: [14, 0], delay: stagger(50) }, 80);
        }

        observer.unobserve(section);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -12% 0px" }
  );

  sections.forEach((section) => {
    section.style.opacity = "0";
    section.style.transform = "translateY(20px)";
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
