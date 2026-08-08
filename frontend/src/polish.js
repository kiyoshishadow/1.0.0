import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./polish.css";
import "./button-refinement.css";
import { gsap } from "gsap";

const navFooter = document.querySelector(".nav-footer");
const motionButton = document.querySelector("#motion-toggle");
const navIcons = {
  dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 12 5l8 7v7a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-7Z"/></svg>',
  impresoras: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v6H7v-6Z"/><path d="M17.5 12h.01"/></svg>',
  suministros: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 13.5-6.6 6.6a2 2 0 0 1-2.8 0L2 11.5V3h8.5l9.5 9.5a.7.7 0 0 1 0 1Z"/><circle cx="7" cy="8" r="1"/></svg>',
  mantenimientos: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5 5L3.4 17.6a2 2 0 1 0 3 3l6.3-6.3a4 4 0 0 0 5-5l-2.4 2.4-3-3 2.4-2.1Z"/></svg>',
  registros: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  reportes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10M12 20V4M19 20v-7"/><path d="M3 20h18"/></svg>',
  configuracion: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5 21a7 7 0 0 1 14 0M19 4v5M16.5 6.5h5"/></svg>',
  auditoria: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9l4 2"/><circle cx="12" cy="12" r="8"/><path d="M6 4 4 2M18 4l2-2"/></svg>',
};

document.querySelectorAll(".station-button").forEach((button) => {
  const icon = button.querySelector(":scope > i:not(.active-marker)");
  if (!icon || !navIcons[button.dataset.stationTarget]) return;
  icon.innerHTML = navIcons[button.dataset.stationTarget];
  const svg = icon.querySelector("svg");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
});

function buildLogoutButton(extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "logout-button " + extraClass;
  button.setAttribute("aria-label", "Cerrar sesión y volver al inicio");
  button.innerHTML = '<span class="logout-glyph"><i class="logout-door"></i><i class="logout-arrow">←</i></span><b>Cerrar sesión</b>';
  button.addEventListener("click", () => {
    if (typeof window.sicisCinematicLogout === "function") window.sicisCinematicLogout();
  });
  return button;
}

const sidebarLogout = buildLogoutButton();
navFooter.insertBefore(sidebarLogout, motionButton);

const topLogout = buildLogoutButton("logout-top-button");
topLogout.querySelector("b").remove();
document.querySelector(".room-actions").appendChild(topLogout);

const curtain = document.createElement("div");
curtain.className = "logout-curtain";
curtain.id = "logout-curtain";
curtain.innerHTML = "<span>CERRANDO SESIÓN</span>";
document.querySelector(".experience").appendChild(curtain);

const magneticTargets = document.querySelectorAll(
  ".launch-button, .primary-action, .add-button, .printer-open, .secondary-action, .detail-timeline button"
);

magneticTargets.forEach((button) => {
  const moveX = gsap.quickTo(button, "x", { duration: 0.42, ease: "power3.out" });
  const moveY = gsap.quickTo(button, "y", { duration: 0.42, ease: "power3.out" });
  button.addEventListener("pointermove", (event) => {
    if (document.documentElement.classList.contains("motion-reduced")) return;
    const rect = button.getBoundingClientRect();
    moveX((event.clientX - rect.left - rect.width / 2) * 0.045);
    moveY((event.clientY - rect.top - rect.height / 2) * 0.055);
  });
  button.addEventListener("pointerleave", () => {
    moveX(0);
    moveY(0);
  });
});

document.querySelectorAll(
  ".launch-button, .primary-action, .add-button, .printer-open, .secondary-action, .station-button, .command-button, .profile, .logout-button"
).forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("i");
    ripple.className = "button-ripple";
    ripple.style.left = event.clientX - rect.left + "px";
    ripple.style.top = event.clientY - rect.top + "px";
    button.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 760);
  });
});
