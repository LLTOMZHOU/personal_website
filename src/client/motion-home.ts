import { animate, createTimeline, stagger } from "animejs";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setupRevealAnimation() {
  const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-home-reveal]"));

  if (revealItems.length === 0) {
    return;
  }

  if (prefersReducedMotion()) {
    revealItems.forEach((item) => {
      item.style.opacity = "1";
      item.style.transform = "none";
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!(entry.target instanceof HTMLElement) || !entry.isIntersecting) {
          return;
        }

        const item = entry.target;
        const delay = Number(item.dataset.revealDelay ?? "0");
        createTimeline({ defaults: { ease: "out(3)", duration: 640 } })
          .add(item, { opacity: [0, 1], y: [20, 0], delay })
          .add(item.querySelectorAll("h2, h3, h4, p, li, article"), { opacity: [0, 1], y: [14, 0], delay: stagger(48) }, 60);
        observer.unobserve(item);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -12% 0px" }
  );

  revealItems.forEach((item) => {
    item.style.opacity = "0";
    item.style.transform = "translateY(20px)";
    observer.observe(item);
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
