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
  revealSections.forEach((section) => {
    observer.observe(section);
  });
}

function setupTiltCards() {
  if (prefersReducedMotion() || window.matchMedia("(pointer: coarse)").matches) {
    return;
  }

  const cards = document.querySelectorAll<HTMLElement>("[data-home-tilt]");

  cards.forEach((card) => {
    let bounds: DOMRect | null = null;
    let frameId: number | null = null;
    let pointerX = 0;
    let pointerY = 0;

    const updateBounds = () => {
      bounds = card.getBoundingClientRect();
    };

    const applyTilt = () => {
      frameId = null;

      if (!bounds) {
        updateBounds();
      }

      if (!bounds || bounds.width === 0 || bounds.height === 0) {
        return;
      }

      const x = pointerX - bounds.left;
      const y = pointerY - bounds.top;
      const rotateX = ((y / bounds.height) - 0.5) * -3.2;
      const rotateY = ((x / bounds.width) - 0.5) * 3.8;

      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    card.style.transformStyle = "preserve-3d";
    card.style.transition = "transform 180ms cubic-bezier(0.215, 0.61, 0.355, 1)";
    card.style.willChange = "transform";

    card.addEventListener("pointerenter", () => {
      updateBounds();
    });

    card.addEventListener("pointermove", (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (frameId === null) {
        frameId = window.requestAnimationFrame(applyTilt);
      }
    });

    card.addEventListener("pointerleave", () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }

      bounds = null;
      card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    });
  });
}

setupRevealAnimation();
setupTiltCards();
