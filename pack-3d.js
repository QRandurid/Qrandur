import { roundedShape, panelGeometry } from "./pack-model.js";

const openButton = document.getElementById("packOpenBtn");
const replayButton = document.getElementById("packResetBtn");
const status = document.getElementById("packStatus");
const host = document.getElementById("pack3d");
const loading = document.getElementById("pack3dLoading");
const showcase = document.getElementById("packShowcase");
const progressBar = document.querySelector(".packProgress");
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

openButton.disabled = true;
status.textContent = "Laen uut kaardipakki…";

async function libraries() {
  try {
    const THREE = await import(
      "https://cdn.jsdelivr.net/npm/three@0.180.0/+esm"
    );
    const { GLTFLoader } = await import(
      "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js/+esm"
    );
    return { THREE, GLTFLoader };
  } catch {
    const THREE = await import("https://esm.sh/three@0.180.0");
    const { GLTFLoader } = await import(
      "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js"
    );
    return { THREE, GLTFLoader };
  }
}

try {
  const { THREE, GLTFLoader } = await libraries();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 5, 1200);
  scene.add(new THREE.HemisphereLight(0xece1ff, 0x21132e, 2.4));
  const key = new THREE.DirectionalLight(0xfff7ed, 3.1);
  key.position.set(-80, 130, 160);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe2ccff, 1.7);
  fill.position.set(100, 35, 130);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xa970ff, 2.6);
  rim.position.set(80, 80, -70);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);
  const loader = new GLTFLoader();
  const textureLoader = new THREE.TextureLoader();
  const [model, frontTexture, backTexture] = await Promise.all([
    loader.loadAsync("./QRandur_card_pack_3D.glb?v=hinged-v2"),
    textureLoader.loadAsync("./front.jpg"),
    textureLoader.loadAsync("./back.jpg"),
  ]);
  const pack = model.scene;
  root.add(pack);
  const lid = pack.getObjectByName("lidPivot");
  const lip = pack.getObjectByName("lipPivot");
  const leftTuck = pack.getObjectByName("leftTuck");
  const rightTuck = pack.getObjectByName("rightTuck");
  if (!lid || !lip || !leftTuck || !rightTuck)
    throw new Error("Pack model is missing its articulated lid");
  pack.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });

  for (const texture of [frontTexture, backTexture]) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  }
  // Share geometry and materials across ten cards. Five rise into the preview fan.
  const cardWidth = 64,
    cardHeight = 41.4;
  const faceGeometry = new THREE.ShapeGeometry(
    roundedShape(THREE, cardWidth, cardHeight, 1.5),
    12,
  );
  const positions = faceGeometry.attributes.position;
  const uv = faceGeometry.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      positions.getX(i) / cardWidth + 0.5,
      positions.getY(i) / cardHeight + 0.5,
    );
  const edgeGeometry = panelGeometry(THREE, cardWidth, cardHeight, 0.45, 1.5);
  const frontMaterial = new THREE.MeshPhysicalMaterial({
    map: frontTexture,
    roughness: 0.55,
    clearcoat: 0.22,
    clearcoatRoughness: 0.5,
  });
  const backMaterial = new THREE.MeshPhysicalMaterial({
    map: backTexture,
    roughness: 0.55,
    clearcoat: 0.22,
  });
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: 0xeee6f7,
    roughness: 0.75,
  });
  const cards = [];
  for (let i = 0; i < 10; i++) {
    const card = new THREE.Group();
    card.name = `previewCard${i}`;
    card.add(new THREE.Mesh(edgeGeometry, edgeMaterial));
    const front = new THREE.Mesh(faceGeometry, frontMaterial);
    front.position.z = 0.58;
    card.add(front);
    const back = new THREE.Mesh(faceGeometry, backMaterial);
    back.position.z = -0.58;
    back.rotation.y = Math.PI;
    card.add(back);
    root.add(card);
    cards.push(card);
  }

  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext("2d");
  const gradient = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,.5)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 80),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -54;
  root.add(shadow);

  const clamp = (v, low = 0, high = 1) => Math.min(high, Math.max(low, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const phase = (p, a, b) => smooth(clamp((p - a) / (b - a)));
  const mix = THREE.MathUtils.lerp;
  const finalX = [-54, -27, 0, 27, 54];
  const finalY = [101, 118, 124, 118, 101];
  const finalAngle = [-0.42, -0.21, 0, 0.21, 0.42];
  const duration = 4800;
  let state = "closed",
    elapsed = 0,
    progress = 0,
    lastTime = null;
  let frame = null,
    inView = false,
    contextLost = false;
  let targetYaw = -0.22,
    yaw = -0.22,
    targetPitch = 0.025,
    pitch = 0.025;
  let pointer = null,
    width = 1,
    height = 1;

  function fitCamera(p) {
    const framing = phase(p, 0.05, 0.4);
    const halfHeight = mix(69, 128, framing);
    const halfWidth = mix(52, 101, framing);
    const distance =
      Math.max(halfHeight, halfWidth / camera.aspect) /
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const targetY = mix(0, 35, framing);
    camera.position.set(0, targetY + distance * 0.22, distance);
    camera.lookAt(0, targetY, 0);
  }
  function pose(p) {
    progress = p;
    lid.rotation.x = -2.3 * phase(p, 0.035, 0.24);
    lip.rotation.x = -0.45 * phase(p, 0.025, 0.12);
    leftTuck.rotation.z = 0.9 * phase(p, 0.1, 0.27);
    rightTuck.rotation.z = -0.9 * phase(p, 0.1, 0.27);
    cards.forEach((card, i) => {
      const stackZ = 5.85 - i * 1.3;
      if (i >= 5) {
        card.position.set(0, 0, stackZ);
        card.rotation.set(0, 0, Math.PI / 2);
        return;
      }
      const start = 0.22 + i * 0.105;
      const lift = easeOut(clamp((p - start) / 0.24));
      const fan = phase(p, start + 0.17, Math.min(1, start + 0.36));
      // Rise upright through the opening before turning and spreading out.
      const highY = 121 + i * 2;
      card.position.set(
        finalX[i] * fan,
        mix(mix(0, highY, lift), finalY[i], fan),
        mix(stackZ, 18 + i * 1.3, fan),
      );
      card.rotation.set(
        0,
        0.04 * Math.sin(i),
        mix(Math.PI / 2, finalAngle[i], fan),
      );
    });
    progressBar.style.setProperty("--pack-progress", p);
    fitCamera(p);
  }
  function ensureFrame() {
    if (frame === null && inView && !document.hidden && !contextLost)
      frame = requestAnimationFrame(animate);
  }
  function pauseFrames() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
  }
  function setClosed() {
    state = "closed";
    elapsed = 0;
    lastTime = null;
    showcase.classList.remove("is-opening", "is-open");
    openButton.disabled = false;
    openButton.textContent = "Ava pakk";
    replayButton.hidden = true;
    status.textContent = "Pakk on suletud. Vajuta „Ava pakk”.";
    pose(0);
    ensureFrame();
  }
  function completeOpen() {
    state = "open";
    pose(1);
    showcase.classList.remove("is-opening");
    showcase.classList.add("is-open");
    openButton.disabled = true;
    openButton.textContent = "Pakk avatud";
    replayButton.hidden = false;
    status.textContent = "Pakk on avatud. 3D-kaardid on lehvikus väljas.";
    ensureFrame();
  }
  function startOpen() {
    if (state !== "closed" || contextLost) return;
    state = "opening";
    elapsed = 0;
    lastTime = null;
    showcase.classList.add("is-opening");
    openButton.disabled = true;
    replayButton.hidden = true;
    openButton.textContent = "Pakk avaneb…";
    status.textContent =
      "Klapp avaneb ja kaardid tõusevad ükshaaval pakist välja…";
    if (motion.matches) completeOpen();
    else ensureFrame();
  }
  openButton.addEventListener("click", startOpen);
  replayButton.addEventListener("click", () => {
    setClosed();
    startOpen();
  });

  function animate(now) {
    frame = null;
    const delta = lastTime === null ? 0 : Math.max(0, now - lastTime);
    lastTime = now;
    if (state === "opening") {
      elapsed += delta;
      pose(clamp(elapsed / duration));
      if (progress >= 1) completeOpen();
    }
    yaw = motion.matches
      ? targetYaw
      : THREE.MathUtils.damp(yaw, targetYaw, 10, Math.min(0.1, delta / 1000));
    pitch = motion.matches
      ? targetPitch
      : THREE.MathUtils.damp(
          pitch,
          targetPitch,
          10,
          Math.min(0.1, delta / 1000),
        );
    root.rotation.set(
      pitch,
      yaw,
      motion.matches || state !== "closed" ? 0 : Math.sin(now * 0.0005) * 0.008,
    );
    root.position.y =
      motion.matches || state !== "closed" ? 0 : Math.sin(now * 0.0011) * 0.6;
    renderer.render(scene, camera);
    if (!motion.matches || state === "opening") ensureFrame();
  }

  function resize() {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fitCamera(progress);
    ensureFrame();
  }
  new ResizeObserver(resize).observe(host);
  resize();
  new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting;
      if (inView) ensureFrame();
      else pauseFrames();
    },
    { rootMargin: "60px" },
  ).observe(host);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseFrames();
    else ensureFrame();
  });
  motion.addEventListener("change", () => {
    if (motion.matches && state === "opening") completeOpen();
    else ensureFrame();
  });

  renderer.domElement.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener("pointermove", (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    targetYaw = clamp(
      targetYaw + (event.clientX - pointer.x) * 0.006,
      -0.72,
      0.72,
    );
    targetPitch = clamp(
      targetPitch + (event.clientY - pointer.y) * 0.002,
      -0.12,
      0.14,
    );
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    ensureFrame();
  });
  const release = () => {
    pointer = null;
  };
  renderer.domElement.addEventListener("pointerup", release);
  renderer.domElement.addEventListener("pointercancel", release);
  renderer.domElement.addEventListener("lostpointercapture", release);
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    contextLost = true;
    pauseFrames();
    openButton.disabled = true;
    status.textContent = "Taastan 3D-vaadet…";
  });
  renderer.domElement.addEventListener("webglcontextrestored", () => {
    contextLost = false;
    openButton.disabled = state !== "closed";
    status.textContent =
      state === "open"
        ? "Pakk on avatud. 3D-kaardid on lehvikus väljas."
        : state === "opening"
          ? "Pakk avaneb…"
          : "3D mudel valmis. Vajuta „Ava pakk”.";
    ensureFrame();
  });

  setClosed();
  loading.classList.add("hide");
  status.textContent = "3D mudel valmis. Vajuta „Ava pakk”.";
  // Expose semantic state for functional checks without exposing scene internals.
  showcase.dataset.model = "hinged-box-v2";
} catch (error) {
  console.error(error);
  loading.innerHTML = "<b>3D vaade pole praegu saadaval</b>";
  progressBar.hidden = true;
  openButton.disabled = true;
  openButton.textContent = "3D ei laaditud";
  status.textContent =
    "Paki vaatamiseks kontrolli internetiühendust ja värskenda lehte. Kaarte saad edasi vaadata ja valida allpool.";
}
