import { gsap } from "gsap";

const scroller = document.querySelector("#station-viewport");
const root = document.querySelector("#functional-stations");
const selector = [
  ".stat-card",
  ".dashboard-chart-card",
  ".dashboard-alertas-card",
  ".tabla-wrapper",
  ".station tbody tr",
  ".reporte-card",
].join(",");

const observed = new WeakSet();
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const element = entry.target;
    observer.unobserve(element);
    if (document.documentElement.classList.contains("motion-reduced")) continue;
    const index = Number(element.dataset.motionIndex || 0);
    gsap.fromTo(element,
      { y: 34, z: -38, rotateX: 4, opacity: 0 },
      { y: 0, z: 0, rotateX: 0, opacity: 1, duration: .72, delay: Math.min(index * .035, .25), ease: "power3.out", clearProps: "transform,opacity" },
    );
  }
}, { root: scroller, threshold: .12, rootMargin: "0px 0px -7% 0px" });

function registerMotionElements(scope = root) {
  scope.querySelectorAll(selector).forEach((element, index) => {
    if (observed.has(element)) return;
    observed.add(element);
    element.dataset.motionIndex = String(index % 8);
    element.style.transformStyle = "preserve-3d";
    observer.observe(element);
  });
}

registerMotionElements();
new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) registerMotionElements(node);
    }
  }
}).observe(root, { childList: true, subtree: true });

const headerY = gsap.quickTo(".room-header", "y", { duration: .45, ease: "power3.out" });
let previousScroll = 0;
scroller.addEventListener("scroll", () => {
  const delta = scroller.scrollTop - previousScroll;
  previousScroll = scroller.scrollTop;
  headerY(Math.max(-7, Math.min(7, delta * -.16)));
  window.clearTimeout(scroller._sicisScrollTimer);
  scroller._sicisScrollTimer = window.setTimeout(() => headerY(0), 90);
}, { passive: true });

window.addEventListener("sicis:stationchange", () => {
  scroller.scrollTo({ top: 0, behavior: document.documentElement.classList.contains("motion-reduced") ? "auto" : "smooth" });
  registerMotionElements();
});
