/* The Ray in 3D. One fixed canvas behind the page. Three big moments: the hero, the configurator, the close.
   Between them the Ray leaves the frame on its own terms (it grows toward the camera and rises out, or sinks
   away), it never shrinks into a sticker. Everywhere: mouse parallax, inertia that tilts it into the scroll,
   a soft contact shadow, and bloom on the metal highlights.
   No WebGL, reduced motion on a phone, or a slow connection: the product photos carry the page (body.no3d). */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const stage = document.getElementById("stage");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = () => innerWidth < 900;
const conn = navigator.connection || {};
const slow = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "") || (phone() && conn.effectiveType === "3g");
const MODEL = stage.dataset.model || "assets/3d/ray.glb";
const ENV = stage.dataset.env || "assets/3d/studio_small_03_1k.hdr";
function bail() { document.body.classList.add("no3d"); }
let renderer = null;
if (slow) bail();
else try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); } catch (e) { bail(); }
if (renderer) init();

function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, phone() ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, innerWidth / innerHeight, 0.01, 10);
  const DIST = 1; camera.position.set(0, 0, DIST); camera.lookAt(0, 0, 0);
  const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * DIST;

  const pmrem = new THREE.PMREMGenerator(renderer); pmrem.compileEquirectangularShader();
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  new RGBELoader().load(ENV, (hdr) => { scene.environment = pmrem.fromEquirectangular(hdr).texture; hdr.dispose(); });

  const key = new THREE.DirectionalLight(0xffe2b8, 1.6); key.position.set(0.3, 0.8, 0.5); scene.add(key);
  const warm = new THREE.DirectionalLight(0xffb060, 0.7); warm.position.set(-0.6, 0.2, 0.6); scene.add(warm);
  const rim = new THREE.DirectionalLight(0xffc97a, 0); rim.position.set(-0.8, 0.3, -0.5); scene.add(rim);
  const sun = new THREE.PointLight(0xffc453, 0, 3, 2); sun.position.set(0.25, 0.35, 0.3); scene.add(sun);

  const root = new THREE.Group(), tilt = new THREE.Group(), spin = new THREE.Group(), model = new THREE.Group();
  scene.add(root); root.add(tilt); tilt.add(spin); spin.add(model); root.visible = false;
  // contact shadow: a soft radial blob under the band, drawn on a canvas so it has no hard edge
  const sc = document.createElement("canvas"); sc.width = sc.height = 256; const g2 = sc.getContext("2d");
  const grad = g2.createRadialGradient(128, 128, 10, 128, 128, 128); grad.addColorStop(0, "rgba(60,38,14,0.42)"); grad.addColorStop(0.45, "rgba(60,38,14,0.12)"); grad.addColorStop(1, "rgba(60,38,14,0)");
  g2.fillStyle = grad; g2.fillRect(0, 0, 256, 256);
  const shadowTex = new THREE.CanvasTexture(sc); shadowTex.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.renderOrder = -1; root.add(ground);
  let modelWidth = 0;

  renderer.setClearColor(0x000000, 0);

  const mats = {}, parts = {}, glb = {};
  mats.gold = new THREE.MeshPhysicalMaterial({ color: 0xe6b874, metalness: 1, roughness: 0.12, envMapIntensity: 1.6 });
  mats.silver = new THREE.MeshPhysicalMaterial({ color: 0xe8eaed, metalness: 1, roughness: 0.1, envMapIntensity: 1.6 });
  mats.glass = new THREE.MeshPhysicalMaterial({ color: 0x06070a, metalness: 0, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.6, envMapIntensity: 1.6 });
  mats.cognac = new THREE.MeshStandardMaterial({ color: 0x8e4f25, roughness: 0.58 });
  mats.onyx = new THREE.MeshStandardMaterial({ color: 0x17120f, roughness: 0.55 });
  mats.carbon = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.75 });

  new GLTFLoader().load(MODEL, (g) => {
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      parts[o.name] = o;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m && m.name) glb[m.name] = m; });
    });
    [["M_Leather_Cognac", "cognac"], ["M_Leather_Onyx", "onyx"], ["M_Silicone", "carbon"]].forEach(([n, k]) => {
      const m = glb[n]; if (!m) return; m.envMapIntensity = 0.8; if (m.normalMap) m.normalScale.set(1.6, 1.6); mats[k] = m;
    });
    if (glb.M_Gold) { glb.M_Gold.color.set(0xe6b874); glb.M_Gold.envMapIntensity = 1.6; glb.M_Gold.roughness = 0.1; mats.gold = glb.M_Gold; }
    if (glb.M_Silver) { glb.M_Silver.color.set(0xe8eaed); glb.M_Silver.envMapIntensity = 1.6; mats.silver = glb.M_Silver; }
    if (glb.M_Glass) { const q = glb.M_Glass; q.clearcoat = 1; q.clearcoatRoughness = 0.06; q.envMapIntensity = 1.3; q.roughness = 0.1; mats.glass = q; }
    if (glb.M_Cell) glb.M_Cell.envMapIntensity = 0.5;
    model.add(g.scene); fit();
    applyConfig(window.CL ? CL.config : { case: "gold", band: "cognac" });
    document.body.classList.add("model-ready");
  }, undefined, bail);

  function fit() {
    root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.setScalar(1); tilt.rotation.set(0, 0, 0); spin.rotation.set(0, 0, 0); model.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    const s = box.getSize(new THREE.Vector3()); modelWidth = Math.max(s.x, s.z, 0.02);
    ground.position.set(0, -s.y * 0.5 + 0.0015, 0); ground.scale.set(modelWidth * 0.9, modelWidth * 0.45, 1);
  }
  function applyConfig(cfg) {
    const metal = cfg.case === "silver" ? mats.silver : mats.gold;
    ["Case", "Buckle", "Buckle_Silicone"].forEach((n) => { if (parts[n]) parts[n].material = metal; });
    if (parts.Sensor) parts.Sensor.material = mats.glass;
    if (parts.Glass) parts.Glass.material = mats.glass;
    if (parts.Band_Link) parts.Band_Link.visible = false;
    if (parts._Swatches) parts._Swatches.visible = false;
    if (parts.Band_Leather) { parts.Band_Leather.visible = cfg.band !== "carbon"; parts.Band_Leather.material = cfg.band === "onyx" ? mats.onyx : mats.cognac; }
    if (parts.Band_Silicone) parts.Band_Silicone.visible = cfg.band === "carbon";
    if (parts.Buckle) parts.Buckle.visible = cfg.band !== "carbon";
    if (parts.Buckle_Silicone) parts.Buckle_Silicone.visible = cfg.band === "carbon";
  }
  if (window.CL && CL.onConfig) CL.onConfig(applyConfig);

  // the three moments: a pose at an anchor, plus how the Ray leaves when you scroll on
  const MOMENTS = [
    { sec: "#reserve",   anchor: "#hero-slot",   leave: "#hero-slot", leaveStart: "bottom 70%", fx: 0.5, fy: 0.5, size: 0.92, rx: 1.05, ry: -0.7, rz: 0.25, sunI: 0.5, rimI: 0, exit: "up" },
    { sec: "#configure", anchor: "#config-slot", leave: "#configure", leaveStart: "bottom 75%", fx: 0.5, fy: 0.48, size: 0.9, rx: 1.15, ry: -0.6, rz: 0.2, sunI: 0.5, rimI: 0, exit: "down" },
    { sec: "#dawn",      anchor: "#dawn",        leave: "#dawn", leaveStart: "bottom 55%", fx: 0.5, fy: 0.12, size: 0.2, rx: 1.3, ry: -0.5, rz: 0.1, sunI: 2, rimI: 0, exit: "up" },
  ];
  const state = { i: 0, enter: 1, leave: 0 };
  if (window.gsap && window.ScrollTrigger) {
    MOMENTS.forEach((m, i) => {
      const el = document.querySelector(m.sec); if (!el) return;
      if (i > 0) ScrollTrigger.create({ trigger: el, start: "top 95%", end: "top 30%", scrub: reduce ? false : 0.5,
        onUpdate: (st) => { state.i = i; state.enter = st.progress; state.leave = 0; } });
      ScrollTrigger.create({ trigger: document.querySelector(m.leave) || el, start: m.leaveStart || "bottom 75%", end: "bottom 5%", scrub: reduce ? false : 0.5,
        onUpdate: (st) => { if (state.i === i || st.progress > 0) { state.i = i; state.enter = 1; state.leave = st.progress; } },
        onLeaveBack: () => { if (state.i === i) state.leave = 0; } });
    });
  }

  function rectOf(sel) { const el = document.querySelector(sel); return el ? el.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight }; }
  function toWorld(px, py) { return new THREE.Vector3(((px / innerWidth) * 2 - 1) * (visH / 2) * camera.aspect, (-(py / innerHeight) * 2 + 1) * (visH / 2), 0); }
  const ease = (t) => 1 - Math.pow(1 - t, 3), easeIn = (t) => t * t * t;

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * 2; stage.classList.toggle("grab", overSlot(e)); }, { passive: true });
  let lastY = scrollY, scrollV = 0;
  addEventListener("scroll", () => { scrollV += (scrollY - lastY) * 0.0025; lastY = scrollY; }, { passive: true });

  let drag = null, vel = 0, userY = 0, userX = 0;
  function overSlot(e) { for (const sel of ["#hero-slot", "#config-slot"]) { const r = document.querySelector(sel)?.getBoundingClientRect(); if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return true; } return false; }
  stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; stage.setPointerCapture(e.pointerId); });
  addEventListener("pointermove", (e) => { if (!drag) return; userY += (e.clientX - drag.x) * 0.012; userX += (e.clientY - drag.y) * 0.008; vel = (e.clientX - drag.x) * 0.012; drag = { x: e.clientX, y: e.clientY }; }, { passive: true });
  addEventListener("pointerup", () => { drag = null; });
  addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    clock.getDelta(); const T = clock.elapsedTime;
    if (!modelWidth) return;
    const m = MOMENTS[state.i], r = rectOf(m.anchor);
    const short = Math.min(r.width, r.height);
    let px = r.left + r.width * m.fx, py = r.top + r.height * m.fy, size = short * m.size;
    if (phone()) { size = Math.min(size, r.height * 0.62, innerWidth * 0.66); py = r.top + r.height * 0.56; }
    const a = ease(state.enter), l = easeIn(state.leave);
    let scaleK = 0.6 + 0.4 * a;
    py += (1 - a) * innerHeight * 0.45;
    if (m.exit === "up") { py -= l * (innerHeight * 0.9 + size); scaleK *= 1 + l * 0.6; }
    else { py += l * innerHeight * 0.4; scaleK *= 1 - l * 0.55; }
    const worldW = (size * scaleK) / innerHeight * visH;
    root.position.copy(toWorld(px, py)); root.scale.setScalar(worldW / modelWidth);
    root.rotation.set(m.rx + l * (m.exit === "up" ? -0.6 : 0.4), m.ry + l * 0.8, m.rz);
    root.visible = state.leave < 0.999 && py > -size && py < innerHeight + size;
    sun.intensity = m.sunI * a; rim.intensity = m.rimI;
    ground.visible = state.i !== 2; ground.material.opacity = (1 - l) * a;
    mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
    scrollV *= 0.9;
    const sv = Math.max(-0.5, Math.min(0.5, scrollV));
    tilt.rotation.set((reduce ? 0 : mouse.y * 0.18) + sv, reduce ? 0 : mouse.x * 0.28, -sv * 0.3);
    if (!drag) { vel *= 0.94; userY += vel; userX *= 0.9; }
    // hero: a slow continuous turn with a pause facing the camera (eased), so the glass, the strap and the clasp each get their moment
    const cyc = (T * 0.11) % 1, turn = reduce ? 0 : (cyc < 0.35 ? Math.sin(cyc / 0.35 * Math.PI / 2) * 0.25 : 0.25 + (cyc - 0.35) / 0.65 * (Math.PI * 2 - 0.25));
    const sway = reduce ? 0 : Math.sin(T * 0.35) * 0.4;
    const yaw = state.i === 0 ? turn : sway;
    spin.rotation.set(userX + (reduce ? 0 : Math.sin(T * 0.6) * 0.05), yaw + userY, reduce ? 0 : Math.sin(T * 0.45) * 0.04);
    spin.position.y = reduce ? 0 : Math.sin(T * 0.9) * 0.004;
    // arriving: a small tumble that settles; leaving: a roll
    spin.rotation.x += (1 - a) * 0.9; spin.rotation.z += l * (m.exit === "up" ? 0.5 : -0.35);
    renderer.render(scene, camera);
  }
  frame();
}
