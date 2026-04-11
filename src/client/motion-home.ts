import { animate, stagger } from "animejs";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function collectRevealTargets(section: HTMLElement) {
  const explicitTargets = Array.from(section.querySelectorAll<HTMLElement>("[data-home-item]"));

  if (explicitTargets.length > 0) {
    return explicitTargets;
  }

  const directChildren = Array.from(section.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  );

  return directChildren.length > 0 ? directChildren : [section];
}

function setupRevealAnimation() {
  const revealSections = Array.from(document.querySelectorAll<HTMLElement>("[data-home-reveal]"));

  if (revealSections.length === 0) {
    return;
  }

  if (prefersReducedMotion()) {
    revealSections.forEach((section) => {
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

        if (section.dataset.homeRevealState === "revealed") {
          observer.unobserve(section);
          return;
        }

        section.dataset.homeRevealState = "revealed";
        const delay = Number(section.dataset.revealDelay ?? "0");
        const targets = collectRevealTargets(section);

        animate(targets, {
          opacity: [0, 1],
          y: [32, 0],
          delay: stagger(140, { start: delay }),
          duration: 980,
          ease: "out(4)"
        });
        observer.unobserve(section);
      });
    },
    { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
  );

  revealSections.forEach((section) => {
    collectRevealTargets(section).forEach((target) => {
      target.style.opacity = "0";
      target.style.transform = "translateY(32px)";
    });
    observer.observe(section);
  });
}

function setupTiltCards() {
  if (prefersReducedMotion() || window.matchMedia("(pointer: coarse)").matches) {
    return;
  }

  const cards = document.querySelectorAll<HTMLElement>("[data-home-tilt]");

  cards.forEach((card) => {
    card.style.transformStyle = "preserve-3d";

    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const rotateX = ((y / bounds.height) - 0.5) * -3.2;
      const rotateY = ((x / bounds.width) - 0.5) * 3.8;

      animate(card, {
        rotateX,
        rotateY,
        duration: 180,
        ease: "out(2)"
      });
    });

    card.addEventListener("pointerleave", () => {
      animate(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 260,
        ease: "out(3)"
      });
    });
  });
}

setupRevealAnimation();
setupTiltCards();
