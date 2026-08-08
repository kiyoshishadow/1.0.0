import "./functional.css";
import "./styles.css";
import "./integration.css";
import "./unified-ui.css";
import "./real-filters.css";
import * as THREE from "three";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { SplitText } from "gsap/SplitText";
import Chart from "chart.js/auto";

gsap.registerPlugin(Flip, SplitText);
gsap.defaults({ ease: "power3.out" });

const app = document.querySelector("#app");
const uiResponse = await fetch("/ui-real.html");
if (!uiResponse.ok) throw new Error("No se pudo cargar la interfaz de SICIS");
app.innerHTML = await uiResponse.text();
window.Chart = Chart;

const functionalResponse = await fetch("/functional.html");
if (!functionalResponse.ok) throw new Error("No se pudieron cargar los módulos funcionales de SICIS");
const functionalDocument = new DOMParser().parseFromString(await functionalResponse.text(), "text/html");
const stationMap = {
  dashboard: "dashboard",
  impresoras: "impresoras",
  suministros: "suministros",
  mantenimientos: "mantenimientos",
  registros: "registros",
  reportes: "reportes",
  configuracion: "configuracion",
  auditoria: "auditoria",
};
const sectionPresentation = {
  dashboard: { eyebrow: "VISIÓN DE SISTEMA", title: "Pulso operativo", description: "Estado de la flota, consumos y alertas que requieren atención." },
  impresoras: { eyebrow: "FLOTA CONECTADA", title: "Equipos conectados", description: "Consulta el estado y la disponibilidad de cada equipo institucional." },
  suministros: { eyebrow: "INVENTARIO ACTIVO", title: "Suministros", description: "Controla existencias, códigos y niveles críticos en un solo lugar." },
  mantenimientos: { eyebrow: "CONTINUIDAD OPERATIVA", title: "Mantenimientos", description: "Planifica intervenciones y sigue cada servicio técnico." },
  registros: { eyebrow: "TRAZA DIARIA", title: "Registro diario", description: "Historial de lecturas, uso de papel y consumo de tóner." },
  reportes: { eyebrow: "INTELIGENCIA OPERATIVA", title: "Reportes", description: "Convierte la actividad de la flota en decisiones claras." },
  configuracion: { eyebrow: "ADMINISTRACIÓN DE ACCESO", title: "Perfiles y accesos", description: "Crea cuentas, asigna responsabilidades y controla quién puede operar cada módulo." },
  auditoria: { eyebrow: "TRAZABILIDAD", title: "Bitácora de auditoría", description: "Revisa las acciones relevantes registradas por el sistema." },
};
const functionalStations = document.querySelector("#functional-stations");
functionalDocument.querySelectorAll(".seccion-panel").forEach((panel) => {
  const section = panel.id.replace("panel-", "");
  panel.classList.add("station");
  panel.classList.toggle("active", section === "dashboard");
  panel.dataset.station = stationMap[section];
  const container = panel.querySelector(".main-container");
  const presentation = sectionPresentation[section];
  container?.setAttribute("data-reveal", "");
  const legacyTitle = container?.querySelector(".titulo-principal");
  const legacyDescription = container?.querySelector(":scope > .descripcion");
  legacyTitle?.classList.add("legacy-section-title");
  legacyDescription?.classList.add("legacy-section-description");
  if (container && presentation) {
    const intro = document.createElement("header");
    intro.className = "section-intro";
    intro.classList.toggle("profiles-intro", section === "configuracion");
    intro.innerHTML = `<p>${presentation.eyebrow}</p><div><h1>${presentation.title}</h1><span>${presentation.description}</span></div>${section === "configuracion" ? '<button class="btn-principal profile-create-button" id="btn-nuevo-usuario" onclick="abrirModalUsuario()"><span aria-hidden="true">+</span> Crear perfil</button>' : ""}`;
    container.prepend(intro);
  }
  functionalStations.appendChild(panel);
});
functionalDocument.querySelectorAll(".modal-overlay").forEach((modal) => document.querySelector("#experience").appendChild(modal));
await import("./polish.js");
await import("./live-scroll.js");

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = motionPreference.matches;
let sceneMode = "login";
let sceneRunning = true;
let currentStation = "dashboard";
let stationLocked = false;
let toastTimer = 0;

const stationMeta = {
  dashboard: { title: "Resumen general", kicker: "CENTRO DE OPERACIONES", index: "01" },
  impresoras: { title: "Impresoras", kicker: "RECURSOS EN TIEMPO REAL", index: "02" },
  suministros: { title: "Suministros", kicker: "INVENTARIO INSTITUCIONAL", index: "03" },
  mantenimientos: { title: "Mantenimientos", kicker: "CONTINUIDAD OPERATIVA", index: "04" },
  registros: { title: "Registro diario", kicker: "ACTIVIDAD DE EQUIPOS", index: "05" },
  reportes: { title: "Reportes", kicker: "LECTURA DE DATOS", index: "06" },
  configuracion: { title: "Perfiles y accesos", kicker: "ADMINISTRACIÓN DE ACCESO", index: "07" },
  auditoria: { title: "Auditoría", kicker: "TRAZABILIDAD DEL SISTEMA", index: "08" },
};

const sceneCanvas = document.querySelector("#scene-canvas");
const renderer = new THREE.WebGLRenderer({
  canvas: sceneCanvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x06131f, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06131f, 0.085);
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.25, 8.4);

const ambientLight = new THREE.HemisphereLight(0xa9e7ff, 0x06111c, 1.25);
scene.add(ambientLight);
const keyLight = new THREE.DirectionalLight(0x8edfff, 4.2);
keyLight.position.set(4, 6, 7);
keyLight.castShadow = true;
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x775cff, 22, 15, 2);
rimLight.position.set(-4, 1, 2);
scene.add(rimLight);
const cyanLight = new THREE.PointLight(0x27b9ff, 25, 17, 2);
cyanLight.position.set(4, -2, 3);
scene.add(cyanLight);

const printerGroup = new THREE.Group();
printerGroup.position.set(2.55, 0.08, 0);
printerGroup.rotation.set(-0.08, -0.42, -0.035);
scene.add(printerGroup);

const darkMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x0b70ba,
  metalness: 0.42,
  roughness: 0.24,
  clearcoat: 0.9,
  clearcoatRoughness: 0.16,
});
const blueMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x21a9e7,
  metalness: 0.24,
  roughness: 0.2,
  clearcoat: 1,
  emissive: 0x063d65,
  emissiveIntensity: 0.45,
});
const whiteMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf4fbff,
  roughness: 0.26,
  metalness: 0.03,
  transmission: 0.02,
});
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xb8ecff,
  transparent: true,
  opacity: 0.25,
  roughness: 0.08,
  metalness: 0.18,
  transmission: 0.28,
});
const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xa9ff86 });

function meshBox(width, height, depth, material, x, y, z, radiusScale = 1) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth, 4, 4, 4), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(radiusScale, radiusScale, radiusScale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  printerGroup.add(mesh);
  return mesh;
}

const mainBody = meshBox(3.15, 1.55, 1.7, blueMaterial, 0, -0.1, 0);
mainBody.rotation.x = -0.02;
const lowerBody = meshBox(2.62, 0.52, 1.48, darkMaterial, 0, -0.92, 0.02);
meshBox(2.15, 0.22, 0.16, glassMaterial, 0, 0.1, 0.89);
meshBox(2.05, 0.76, 0.09, darkMaterial, 0, -0.15, 0.91);
meshBox(1.7, 1.38, 0.07, whiteMaterial, 0, 1.13, -0.23);
meshBox(1.34, 0.11, 0.08, glassMaterial, 0, 0.85, -0.17);
const outputPaper = meshBox(1.58, 0.8, 0.07, whiteMaterial, 0, -0.77, 1.0);
outputPaper.rotation.x = -0.18;
meshBox(1.1, 0.05, 0.03, glassMaterial, 0, -0.64, 1.06);
meshBox(0.76, 0.05, 0.03, glassMaterial, -0.17, -0.79, 1.08);
const statusLed = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 20), glowMaterial);
statusLed.position.set(1.18, 0.36, 0.9);
printerGroup.add(statusLed);

const portalMaterial = new THREE.MeshBasicMaterial({
  color: 0x43c8ff,
  transparent: true,
  opacity: 0.34,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const portalRing = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.026, 12, 180), portalMaterial);
portalRing.position.copy(printerGroup.position);
portalRing.rotation.y = 0.18;
scene.add(portalRing);
const portalRingTwo = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.016, 10, 160), portalMaterial.clone());
portalRingTwo.material.opacity = 0.18;
portalRingTwo.position.copy(printerGroup.position);
portalRingTwo.rotation.set(0.12, -0.1, 0.4);
scene.add(portalRingTwo);

const grid = new THREE.GridHelper(28, 36, 0x1b8fc5, 0x154563);
grid.position.set(1.8, -2.2, -1.5);
grid.material.transparent = true;
grid.material.opacity = 0.13;
scene.add(grid);

const particleCount = 650;
const particlePositions = new Float32Array(particleCount * 3);
for (let index = 0; index < particleCount; index += 1) {
  const radius = 5 + Math.random() * 18;
  const angle = Math.random() * Math.PI * 2;
  particlePositions[index * 3] = Math.cos(angle) * radius + 2;
  particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 12;
  particlePositions[index * 3 + 2] = Math.sin(angle) * radius - 6;
}
const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
const particleMaterial = new THREE.PointsMaterial({
  color: 0x58c7f2,
  size: 0.035,
  transparent: true,
  opacity: 0.55,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const particleField = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particleField);

const floatingPanels = new THREE.Group();
scene.add(floatingPanels);
for (let index = 0; index < 8; index += 1) {
  const panelMaterial = new THREE.MeshBasicMaterial({
    color: index % 3 === 0 ? 0x7566ee : 0x1ba5e7,
    transparent: true,
    opacity: 0.08 + Math.random() * 0.08,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.4 + Math.random() * 0.7, 0.12), panelMaterial);
  const angle = index / 8 * Math.PI * 2;
  panel.position.set(Math.cos(angle) * (4 + Math.random() * 2) + 2, (Math.random() - 0.5) * 4, Math.sin(angle) * 3 - 2);
  panel.rotation.set(Math.random(), Math.random(), Math.random());
  floatingPanels.add(panel);
}

const pointer = { x: 0, y: 0 };
window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX / window.innerWidth * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight * 2 - 1);
}, { passive: true });

const clock = new THREE.Clock();
function renderScene() {
  if (!sceneRunning) return;
  const elapsed = clock.getElapsedTime();
  particleField.rotation.y = elapsed * 0.012;
  floatingPanels.rotation.y = -elapsed * 0.025;
  portalRing.rotation.z = elapsed * 0.08;
  portalRingTwo.rotation.z = -elapsed * 0.11;

  if (sceneMode === "login" && !reducedMotion) {
    printerGroup.rotation.y += ((-0.42 + pointer.x * 0.13) - printerGroup.rotation.y) * 0.045;
    printerGroup.rotation.x += ((-0.08 - pointer.y * 0.065) - printerGroup.rotation.x) * 0.045;
    printerGroup.position.y = 0.08 + Math.sin(elapsed * 0.8) * 0.075;
    camera.position.x += (pointer.x * 0.12 - camera.position.x) * 0.035;
    camera.position.y += ((0.25 + pointer.y * 0.07) - camera.position.y) * 0.035;
  }
  statusLed.scale.setScalar(1 + Math.sin(elapsed * 3.2) * 0.16);
  renderer.render(scene, camera);
  requestAnimationFrame(renderScene);
}
requestAnimationFrame(renderScene);

function resizeScene() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, reducedMotion ? 1 : 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resizeScene);
document.addEventListener("visibilitychange", () => {
  sceneRunning = !document.hidden && sceneMode === "login";
  if (sceneRunning && !reducedMotion) {
    clock.getDelta();
    requestAnimationFrame(renderScene);
  }
});

const introSplit = SplitText.create(".login-title", {
  type: "lines,words",
  mask: "lines",
  aria: "auto",
});
const introTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
introTimeline
  .from(".cinema-header", { y: -25, opacity: 0, duration: 0.7 })
  .from(".overline", { x: -20, opacity: 0, duration: 0.45 }, 0.15)
  .from(introSplit.words, { yPercent: 115, rotateX: -22, opacity: 0, stagger: 0.045, duration: 0.85 }, 0.2)
  .from(".login-lead", { y: 20, opacity: 0, duration: 0.65 }, 0.56)
  .from(".system-status span", { y: 14, opacity: 0, stagger: 0.08, duration: 0.5 }, 0.7)
  .from(".login-panel", { x: 55, z: -120, rotateY: -10, opacity: 0, duration: 0.9 }, 0.32)
  .from(".scene-callout", { opacity: 0, scaleX: 0, transformOrigin: "left center", stagger: 0.12, duration: 0.6 }, 0.9)
  .from(".cinema-footer", { opacity: 0, duration: 0.6 }, 0.86)
  .from(printerGroup.scale, { x: 0.65, y: 0.65, z: 0.65, duration: 1.2, ease: "elastic.out(1,0.65)" }, 0.18);

function showToast(message) {
  const toast = document.querySelector("#toast");
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  gsap.to(toast, { opacity: 1, y: 0, scale: 1, duration: 0.32 });
  toastTimer = window.setTimeout(() => {
    gsap.to(toast, { opacity: 0, y: 20, scale: 0.96, duration: 0.28 });
  }, 2600);
}

function activateRoom() {
  const room = document.querySelector("#control-room");
  room.setAttribute("aria-hidden", "false");
  room.style.visibility = "visible";
  const roomTimeline = gsap.timeline({
    onComplete: () => {
      document.querySelector("#login-scene").style.display = "none";
      sceneMode = "room";
      printerGroup.visible = false;
      portalRing.material.opacity = 0.06;
      portalRingTwo.material.opacity = 0.035;
      grid.material.opacity = 0.035;
      particleMaterial.opacity = 0.16;
      camera.position.set(0, 0.4, 9.5);
      animateStation(document.querySelector('[data-station="dashboard"]'));
      sceneCanvas.style.opacity = "0";
      sceneRunning = false;
    },
  });
  roomTimeline
    .to("#login-scene", { opacity: 0, scale: 1.08, filter: "blur(10px)", duration: 0.55 }, 0)
    .to(room, { opacity: 1, scale: 1, duration: 0.9, ease: "expo.out" }, 0.12)
    .from(".control-nav", { x: -100, duration: 0.75, ease: "expo.out" }, 0.2)
    .from(".room-header", { y: -45, opacity: 0, duration: 0.65 }, 0.28)
    .from(".station.active", { z: -220, rotateX: 5, opacity: 0, duration: 0.85 }, 0.34);
}

function runLaunchSequence() {
  if (document.body.classList.contains("launching")) return;
  document.body.classList.add("launching");
  const launchTimeline = gsap.timeline({ defaults: { ease: "power3.inOut" } });
  launchTimeline
    .to(".launch-button", { scale: 0.96, duration: 0.11, yoyo: true, repeat: 1 })
    .to(".login-copy, .cinema-header, .cinema-footer, .scene-callout", { opacity: 0, x: -55, duration: 0.42, stagger: 0.025 }, 0.12)
    .to(".login-panel", { opacity: 0, x: 70, rotateY: 12, duration: 0.46 }, 0.15)
    .to(printerGroup.rotation, { y: Math.PI * 1.65, z: 0.08, duration: 0.82 }, 0.08)
    .to(printerGroup.scale, { x: 2.8, y: 2.8, z: 2.8, duration: 0.72, ease: "expo.in" }, 0.35)
    .to(portalRing.scale, { x: 5.2, y: 5.2, z: 5.2, duration: 0.72, ease: "expo.in" }, 0.32)
    .to(portalRing.material, { opacity: 0.95, duration: 0.38 }, 0.36)
    .to(camera.position, { z: 2.15, duration: 0.7, ease: "expo.in" }, 0.35)
    .add(activateRoom, 0.88);
}

document.querySelector("#cinema-login").addEventListener("submit", async (event) => {
  event.preventDefault();
  const usuario = document.querySelector("#usuario").value.trim();
  const password = document.querySelector("#password").value;
  const feedback = document.querySelector("#login-feedback");
  const button = document.querySelector(".launch-button");
  if (!usuario || !password) {
    feedback.textContent = "Completa usuario y contraseña.";
    return;
  }
  button.disabled = true;
  feedback.textContent = "Validando credenciales…";
  try {
    const response = await fetch("/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo iniciar sesión");
    feedback.textContent = "Preparando tu centro de control…";
    const booted = await window.sicisBootstrap?.();
    if (!booted) throw new Error("No se pudo preparar la sesión. Intenta nuevamente.");
  } catch (error) {
    feedback.textContent = error.message;
    button.disabled = false;
    document.body.classList.remove("launching");
  }
});

window.addEventListener("sicis:authenticated", (event) => {
  const user = event.detail;
  const initial = (user.nombre || user.usuario || "S").trim().charAt(0).toUpperCase();
  document.querySelectorAll(".user-orb, .profile-initial").forEach((node) => { node.textContent = initial; });
  if (sceneMode === "login") runLaunchSequence();
});

function animateCounters(scope) {
  scope.querySelectorAll("[data-counter]").forEach((element) => {
    const target = Number(element.dataset.counter);
    const counter = { value: 0 };
    gsap.to(counter, {
      value: target,
      duration: reducedMotion ? 0.01 : 1.15,
      ease: "power2.out",
      onUpdate: () => {
        element.textContent = String(Math.round(counter.value)).padStart(target < 10 ? 2 : 1, "0");
      },
    });
  });
}

function animateStation(station) {
  const revealItems = station.querySelectorAll("[data-reveal]");
  gsap.fromTo(revealItems,
    { y: reducedMotion ? 0 : 22, z: reducedMotion ? 0 : -24, opacity: 0 },
    { y: 0, z: 0, opacity: 1, stagger: reducedMotion ? 0 : 0.035, duration: reducedMotion ? 0.01 : 0.48, ease: "power3.out", clearProps: "transform" }
  );
  animateCounters(station);
  const dataPath = station.querySelector(".data-path");
  if (dataPath) {
    gsap.fromTo(dataPath, { strokeDashoffset: 900 }, { strokeDashoffset: 0, duration: reducedMotion ? 0.01 : 1.25, delay: 0.18, ease: "power2.inOut" });
    gsap.to(station.querySelector(".chart-point"), { opacity: 1, scale: 1, duration: 0.4, delay: reducedMotion ? 0 : 1.05, transformOrigin: "center" });
  }
  station.querySelectorAll(".toner i").forEach((bar) => {
    gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: reducedMotion ? 0.01 : 0.9, delay: 0.18 });
  });
  station.querySelectorAll(".bars i").forEach((bar, index) => {
    gsap.fromTo(bar, { scaleY: 0 }, { scaleY: 1, duration: reducedMotion ? 0.01 : 0.78, delay: index * 0.055, ease: "back.out(1.4)" });
  });
}

function navigateStation(next, trigger) {
  if (!stationMeta[next]) return;
  window.sicisLoadSection?.(next);
  if (next === currentStation || stationLocked) return;
  if (reducedMotion) {
    const oldStation = document.querySelector('[data-station="' + currentStation + '"]');
    const newStation = document.querySelector('[data-station="' + next + '"]');
    oldStation.classList.remove("active");
    newStation.classList.add("active");
    currentStation = next;
    updateNavigation(next, trigger);
    animateStation(newStation);
    window.dispatchEvent(new CustomEvent("sicis:stationchange", { detail: { station: next } }));
    return;
  }

  stationLocked = true;
  const order = Object.keys(stationMeta);
  const direction = order.indexOf(next) > order.indexOf(currentStation) ? 1 : -1;
  const oldStation = document.querySelector('[data-station="' + currentStation + '"]');
  const newStation = document.querySelector('[data-station="' + next + '"]');

  newStation.style.display = "block";
  newStation.style.opacity = "0";
  const movement = 38 * direction;

  updateNavigation(next, trigger);

  const timeline = gsap.timeline({
    defaults: { ease: "power3.inOut" },
    onComplete: () => {
      oldStation.classList.remove("active");
      oldStation.style.display = "";
      oldStation.style.opacity = "";
      gsap.set(oldStation, { clearProps: "all" });
      newStation.classList.add("active");
      gsap.set(newStation, { clearProps: "transform,opacity" });
      currentStation = next;
      stationLocked = false;
      animateStation(newStation);
      window.dispatchEvent(new CustomEvent("sicis:stationchange", { detail: { station: next } }));
    },
  });

  timeline
    .to(oldStation, { x: -movement, scale: .985, opacity: 0, duration: 0.22, ease: "power2.in" }, 0)
    .fromTo(newStation,
      { x: movement, scale: .985, opacity: 0 },
      { x: 0, scale: 1, opacity: 1, duration: 0.36, ease: "power3.out", force3D: true },
      0.1
    );
}

function updateNavigation(next, trigger) {
  window.sicisNavigateStation = navigateStation;

document.querySelectorAll(".station-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.stationTarget === next);
  });
  const marker = document.querySelector(".active-marker");
  const destination = trigger || document.querySelector('[data-station-target="' + next + '"]');
  const markerState = Flip.getState(marker);
  destination.prepend(marker);
  Flip.from(markerState, {
    duration: reducedMotion ? 0.01 : 0.38,
    ease: "power3.out",
    absolute: true,
  });
  gsap.to("#room-title", {
    y: -9,
    opacity: 0,
    duration: 0.16,
    onComplete: () => {
      document.querySelector("#room-title").textContent = stationMeta[next].title;
      document.querySelector("#room-kicker").textContent = stationMeta[next].kicker;
      gsap.fromTo("#room-title", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.34 });
    },
  });
}

document.querySelectorAll(".station-button").forEach((button) => {
  button.addEventListener("click", () => navigateStation(button.dataset.stationTarget, button));
});
document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.go;
    navigateStation(target, document.querySelector('[data-station-target="' + target + '"]'));
  });
});

let detailCard = null;
let detailPlaceholder = null;
let detailSource = null;
function openPrinterDetail(card) {
  if (!card.querySelector(".detail-extra")) {
    showToast("Selecciona Ver para consultar la información actual del equipo.");
    return;
  }
  if (detailCard) return;
  detailCard = card;
  detailSource = card.parentNode;
  detailPlaceholder = document.createComment("printer-card-origin");
  detailSource.insertBefore(detailPlaceholder, card);

  const detailLayer = document.querySelector("#detail-layer");
  const detailSlot = document.querySelector("#detail-slot");
  const state = Flip.getState(card);
  detailLayer.classList.add("show");
  detailLayer.setAttribute("aria-hidden", "false");
  detailSlot.appendChild(card);
  card.classList.add("expanded");

  gsap.fromTo(".detail-backdrop", { opacity: 0 }, { opacity: 1, duration: 0.42 });
  Flip.from(state, {
    duration: reducedMotion ? 0.01 : 0.92,
    ease: "expo.inOut",
    absolute: true,
    nested: true,
    scale: true,
    zIndex: 25,
    onComplete: () => {
      gsap.from(".detail-extra > *", { y: 24, opacity: 0, stagger: 0.07, duration: 0.55, ease: "power3.out" });
      card.querySelector(".detail-close").focus();
    },
  });
}

function closePrinterDetail() {
  if (!detailCard) return;
  const card = detailCard;
  const state = Flip.getState(card);
  card.classList.remove("expanded");
  detailSource.insertBefore(card, detailPlaceholder);

  gsap.to(".detail-backdrop", { opacity: 0, duration: 0.42 });
  Flip.from(state, {
    duration: reducedMotion ? 0.01 : 0.82,
    ease: "expo.inOut",
    absolute: true,
    nested: true,
    scale: true,
    zIndex: 25,
    onComplete: () => {
      document.querySelector("#detail-layer").classList.remove("show");
      document.querySelector("#detail-layer").setAttribute("aria-hidden", "true");
      detailPlaceholder.remove();
      detailCard = null;
      detailPlaceholder = null;
      detailSource = null;
      card.querySelector(".printer-open").focus();
    },
  });
}

document.querySelectorAll(".printer-open").forEach((button) => {
  button.addEventListener("click", () => openPrinterDetail(button.closest(".printer-card")));
});
// The printer detail control is optional in the integrated UI.
document.querySelector(".detail-close")?.addEventListener("click", closePrinterDetail);
document.querySelector(".detail-backdrop")?.addEventListener("click", closePrinterDetail);

function bindTilt(element) {
  gsap.set(element, { transformPerspective: 1100, transformStyle: "preserve-3d" });
  const rotateX = gsap.quickTo(element, "rotationX", { duration: 0.45, ease: "power3.out" });
  const rotateY = gsap.quickTo(element, "rotationY", { duration: 0.45, ease: "power3.out" });
  const moveZ = gsap.quickTo(element, "z", { duration: 0.45, ease: "power3.out" });
  element.addEventListener("pointermove", (event) => {
    if (reducedMotion || element.classList.contains("expanded")) return;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    rotateX(-y * 5);
    rotateY(x * 7);
    moveZ(8);
  });
  element.addEventListener("pointerleave", () => {
    rotateX(0);
    rotateY(0);
    moveZ(0);
  });
}
document.querySelectorAll(".metric, .glass-card, .printer-card").forEach(bindTilt);

const loginPanel = document.querySelector(".login-panel");
loginPanel.addEventListener("pointermove", (event) => {
  if (reducedMotion) return;
  const rect = loginPanel.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  gsap.to(loginPanel, { rotationY: x * 5, rotationX: -y * 4, z: 10, duration: 0.45 });
});
loginPanel.addEventListener("pointerleave", () => {
  gsap.to(loginPanel, { rotationY: 0, rotationX: 0, z: 0, duration: 0.6 });
});

const palette = document.querySelector("#command-palette");
function openPalette() {
  palette.classList.add("open");
  palette.setAttribute("aria-hidden", "false");
  gsap.fromTo(palette.firstElementChild, { y: -25, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: "expo.out" });
  palette.querySelector("input").focus();
}
function closePalette() {
  gsap.to(palette.firstElementChild, {
    y: -14,
    opacity: 0,
    duration: 0.2,
    onComplete: () => {
      palette.classList.remove("open");
      palette.setAttribute("aria-hidden", "true");
    },
  });
}
document.querySelector("#command-button").addEventListener("click", openPalette);
palette.querySelector("header button").addEventListener("click", closePalette);
palette.addEventListener("click", (event) => {
  if (event.target === palette) closePalette();
});
document.querySelectorAll("[data-command-go]").forEach((button) => {
  button.addEventListener("click", () => {
    const next = button.dataset.commandGo;
    closePalette();
    window.setTimeout(() => navigateStation(next, document.querySelector('[data-station-target="' + next + '"]')), 170);
  });
});
window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openPalette();
  }
  if (event.key === "Escape") {
    if (detailCard) closePrinterDetail();
    else if (palette.classList.contains("open")) closePalette();
  }
});

document.querySelector("#motion-toggle").addEventListener("click", () => {
  reducedMotion = !reducedMotion;
  document.documentElement.classList.toggle("motion-reduced", reducedMotion);
  sceneCanvas.style.display = reducedMotion ? "none" : "";
  showToast(reducedMotion ? "Movimiento reducido activado." : "Movimiento cinematográfico activado.");
});
motionPreference.addEventListener("change", (event) => {
  reducedMotion = event.matches;
  document.documentElement.classList.toggle("motion-reduced", reducedMotion);
});

document.querySelector(".live-button")?.addEventListener("click", () => showToast("SICIS está conectado al servidor."));

window.sicisCinematicLogout = async () => {
  if (document.body.classList.contains("logging-out")) return;
  document.body.classList.add("logging-out");
  try {
    const response = await fetch("/logout", { method: "POST", credentials: "include" });
    if (!response.ok) throw new Error("No se pudo cerrar la sesión");
    localStorage.removeItem("userInfo");
    window.sicisResetSession?.();
  } catch (error) {
    document.body.classList.remove("logging-out");
    showToast(error.message);
    return;
  }

  if (detailCard) closePrinterDetail();
  if (palette.classList.contains("open")) closePalette();

  const room = document.querySelector("#control-room");
  const loginScene = document.querySelector("#login-scene");
  const curtain = document.querySelector("#logout-curtain");
  const overviewButton = document.querySelector('[data-station-target="dashboard"]');
  const marker = document.querySelector(".active-marker");

  document.querySelectorAll(".station-button").forEach((button) => {
    button.classList.toggle("active", button === overviewButton);
  });
  overviewButton.prepend(marker);
  document.querySelectorAll(".station").forEach((station) => {
    station.classList.toggle("active", station.dataset.station === "dashboard");
    station.style.display = "";
    station.style.opacity = "";
    gsap.set(station, { clearProps: "transform,filter,opacity" });
  });
  document.querySelector("#room-title").textContent = stationMeta.dashboard.title;
  document.querySelector("#room-kicker").textContent = stationMeta.dashboard.kicker;
  const loginButton = document.querySelector(".launch-button");
  loginButton.disabled = false;
  document.querySelector("#login-feedback").textContent = "Usa tus credenciales de SICIS";
  currentStation = "dashboard";
  stationLocked = false;

  sceneMode = "login";
  sceneCanvas.style.opacity = "1";
  if (!sceneRunning && !document.hidden && !reducedMotion) {
    sceneRunning = true;
    clock.getDelta();
    requestAnimationFrame(renderScene);
  }
  printerGroup.visible = true;
  portalRing.visible = true;
  portalRingTwo.visible = true;
  gsap.set(camera.position, { x: 0, y: 0.25, z: 8.4 });
  gsap.set(printerGroup.position, { x: 2.55, y: 0.08, z: 0 });
  gsap.set(printerGroup.rotation, { x: -0.08, y: -0.42, z: -0.035 });
  gsap.set(printerGroup.scale, { x: 2.4, y: 2.4, z: 2.4 });
  gsap.set(portalRing.scale, { x: 2.1, y: 2.1, z: 2.1 });
  gsap.set(portalRingTwo.scale, { x: 1.8, y: 1.8, z: 1.8 });
  portalRing.material.opacity = 0.58;
  portalRingTwo.material.opacity = 0.25;
  grid.material.opacity = 0.13;
  particleMaterial.opacity = 0.55;

  gsap.set(".login-copy, .cinema-header, .cinema-footer, .scene-callout, .login-panel", { clearProps: "all" });
  gsap.set(loginScene, { display: "block", opacity: 0, scale: 0.94, filter: "blur(13px)" });
  gsap.set(curtain, { opacity: 0 });

  const logoutTimeline = gsap.timeline({
    defaults: { ease: "power3.inOut" },
    onComplete: () => {
      room.style.visibility = "hidden";
      room.setAttribute("aria-hidden", "true");
      gsap.set(room, { opacity: 0, scale: 1.08, clearProps: "filter,rotationY,z" });
      gsap.set(curtain, { opacity: 0 });
      document.body.classList.remove("launching", "logging-out");
      document.querySelector(".launch-button").focus();
    },
  });

  logoutTimeline
    .to(curtain, { opacity: 1, duration: 0.4 }, 0)
    .to(room, { opacity: 0, scale: 1.05, z: -280, rotationY: 5, filter: "blur(9px)", duration: 0.58, ease: "power2.in" }, 0)
    .fromTo(printerGroup.scale, { x: 2.4, y: 2.4, z: 2.4 }, { x: 1, y: 1, z: 1, duration: 1.05, ease: "expo.out" }, 0.48)
    .fromTo(printerGroup.rotation, { y: -1.8 }, { y: -0.42, duration: 1.05, ease: "expo.out" }, 0.48)
    .to(portalRing.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: "expo.out" }, 0.45)
    .to(portalRingTwo.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: "expo.out" }, 0.47)
    .to(loginScene, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.78, ease: "expo.out" }, 0.52)
    .fromTo(".login-copy", { x: -45, opacity: 0 }, { x: 0, opacity: 1, duration: 0.72 }, 0.68)
    .fromTo(".login-panel", { x: 55, rotateY: -10, opacity: 0 }, { x: 0, rotateY: 0, opacity: 1, duration: 0.8 }, 0.72)
    .fromTo(".cinema-header, .cinema-footer, .scene-callout", { opacity: 0 }, { opacity: 1, stagger: 0.07, duration: 0.55 }, 0.78)
    .to(curtain, { opacity: 0, duration: 0.55 }, 0.76);
};

window.sicisNavigateStation = navigateStation;

const dataScript = document.createElement("script");
dataScript.src = "/app-data.js";
dataScript.addEventListener("load", () => window.sicisBootstrap?.());
dataScript.addEventListener("error", () => showToast("No se pudo cargar la lógica de datos de SICIS."));
document.body.appendChild(dataScript);
