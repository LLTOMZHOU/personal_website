import "./motion-photography.css";
import { animate, stagger } from "animejs";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function revealTargets(targets: HTMLElement[]) {
  targets.forEach((target) => {
    target.dataset.motionRevealed = "true";
    target.style.opacity = "1";
    target.style.transform = "none";
  });
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

function sectionIsVisible(section: HTMLElement) {
  const rect = section.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

function setupPhotographyReveal() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-photography-reveal]"));

  if (sections.length === 0) {
    return;
  }

  if (prefersReducedMotion()) {
    sections.forEach((section) => {
      revealTargets(collectRevealTargets(section));
    });
    return;
  }

  sections.forEach((section) => {
    if (sectionIsVisible(section)) {
      section.dataset.photographyRevealState = "revealed";
      revealTargets(collectRevealTargets(section));
    }
  });

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
            revealTargets(targets);
          }
        });

        observer.unobserve(section);
      });
    },
    { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
  );
  sections.forEach((section) => {
    if (section.dataset.photographyRevealState === "revealed") {
      return;
    }

    observer.observe(section);
  });

  document.documentElement.dataset.photographyMotion = "enabled";
}

setupPhotographyReveal();
