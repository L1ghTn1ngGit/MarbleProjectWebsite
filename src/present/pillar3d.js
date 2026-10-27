// the 3d pillar. rotation = distance / radius so it actualy rolls
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

function decode(buffer) {
  const header = new Float32Array(buffer, 0, 10);
  const [count, indexCount, indexBytes, minX, minY, minZ, sizeX, sizeY, sizeZ] = header;
  const align = (n) => Math.ceil(n / 4) * 4;
  let offset = 40;
  const p = new Int16Array(buffer, offset, count * 3);
  offset += align(count * 6);
  const n = new Int8Array(buffer, offset, count * 3);
  offset += align(count * 3);
  const u = new Uint16Array(buffer, offset, count * 2);
  offset += align(count * 4);
  const index = indexBytes === 2 ? new Uint16Array(buffer, offset, indexCount) : new Uint32Array(buffer, offset, indexCount);


  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const min = [minX, minY, minZ];
  const size = [sizeX, sizeY, sizeZ];
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 3; k++) {
      const value = min[k] + ((p[i * 3 + k] + 32768) / 65535) * size[k];
      position[i * 3 + k] = k === 1 ? (value - minY) / sizeY : (value - (min[k] + size[k] / 2)) / sizeY;
      normal[i * 3 + k] = n[i * 3 + k] / 127;
    }
    uv[i * 2] = u[i * 2] / 65535;
    uv[i * 2 + 1] = u[i * 2 + 1] / 65535;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  return { geometry, width: sizeX / sizeY };
}

export async function mountPillars({ isStill, lowDetail = false, pixelBudget = 4.2e6 }) {
  const stage = document.querySelector(".pillar-stage");
  if (!stage) throw new Error("No pillar stage");
  const detail = lowDetail ? "lo" : "xl";
  const loader = new THREE.TextureLoader();
  const [buffer, diffuse, roughness] = await Promise.all([
    fetch("/pillar/pillar.bin").then((response) => {
      if (!response.ok) throw new Error(`pillar.bin ${response.status}`);
      return response.arrayBuffer();
    }),
    loader.loadAsync(`/pillar/diffuse-${detail}.jpg`),
    loader.loadAsync(`/pillar/roughness-${detail}.jpg`),
  ]);
  diffuse.colorSpace = THREE.SRGBColorSpace;
  diffuse.generateMipmaps = true;
  const { geometry, width: modelWidth } = decode(buffer);

  const canvas = document.createElement("canvas");
  canvas.className = "pillar-layer";
  canvas.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  document.body.prepend(canvas);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  diffuse.anisotropy = maxAniso;
  roughness.anisotropy = maxAniso;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfff3e2, 0xb39c7c, 0.55));
  const key = new THREE.DirectionalLight(0xffe8cc, 1.7);
  key.position.set(-0.9, 1.3, 1.2);
  const rim = new THREE.DirectionalLight(0xe3e9ff, 0.7);
  rim.position.set(1.3, 0.5, -0.8);
  scene.add(key, rim);


  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -5000, 5000);
  camera.position.z = 2000;

  const material = new THREE.MeshPhysicalMaterial({
    map: diffuse,
    roughnessMap: roughness,
    roughness: 0.85,
    metalness: 0,
    color: 0xfff0dc,
    clearcoat: 0.4,
    clearcoatRoughness: 0.32,
    envMapIntensity: 0.85,
  });
  const pillar = new THREE.Mesh(geometry, material);
  scene.add(pillar);

  // the shaft is long faces with vertices only at its ends, so it can be stretched
  // to fill a tall, narrow stage without touching the base or the capital
  const positions = geometry.attributes.position;
  const baseY = Float32Array.from({ length: positions.count }, (_, i) => positions.getY(i));
  let widest = 0;
  const radius = (i) => Math.hypot(positions.getX(i), positions.getZ(i));
  for (let i = 0; i < positions.count; i++) widest = Math.max(widest, radius(i));
  let shaftLo = 0, shaftHi = 1;
  for (let i = 0; i < positions.count; i++) {
    if (radius(i) < widest * 0.6) continue;
    if (baseY[i] < 0.5) shaftLo = Math.max(shaftLo, baseY[i]);
    else shaftHi = Math.min(shaftHi, baseY[i]);
  }
  let stretched = 1;
  function stretch(k) {
    if (Math.abs(k - stretched) < 0.002) return;
    stretched = k;
    const grow = k - 1;
    for (let i = 0; i < positions.count; i++) {
      const y = baseY[i];
      positions.setY(i, y <= shaftLo ? y : y >= shaftHi ? y + grow : shaftLo + ((y - shaftLo) * (shaftHi - shaftLo + grow)) / (shaftHi - shaftLo));
    }
    positions.needsUpdate = true;
    geometry.computeBoundingSphere();
  }
  let half = 0;

  let width = 0, height = 0, frame = 0, last = 0, idle = 0, disposed = false;


  function fit(rect) {
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === width && h === height) return;
    width = w;
    height = h;
    const ratio = Math.min(devicePixelRatio || 1, lowDetail ? 1.5 : 2);

    const budget = pixelBudget;
    renderer.setPixelRatio(Math.min(ratio, Math.sqrt(budget / (w * h))));
    renderer.setSize(w, h, false);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    camera.right = w;
    camera.bottom = -h;
    camera.updateProjectionMatrix();
  }
  function resize() {
    width = 0;
    request();
  }

  let drawn = 0;
  let lastKey = "";
  let wasVisible = true;
  function render(time) {
    frame = 0;
    if (disposed || document.hidden) return;
    const dt = last ? Math.min(0.05, (time - last) / 1000) : 0;
    last = time;
    const still = isStill();
    if (!still) idle += dt * 0.12;
    const rect = stage.getBoundingClientRect();
    const style = getComputedStyle(stage);
    const opacity = parseFloat(style.opacity);

    canvas.style.opacity = String(opacity);
    pillar.visible = rect.width > 0 && opacity > 0.01;
    if (pillar.visible) {
      fit(rect);
      canvas.style.transform = `translate3d(${rect.left.toFixed(1)}px, ${rect.top.toFixed(1)}px, 0)`;

      // as wide as the stage allows, with the shaft lengthened to reach the full height
      const scale = Math.min(rect.height, rect.width / modelWidth);
      stretch(Math.min(1.8, rect.height / scale));
      half = (scale * modelWidth) / 2;
      pillar.scale.setScalar(scale);
      pillar.position.set(rect.width / 2, -rect.height, 0);

      const radius = (scale * modelWidth) / 2;
      pillar.rotation.y = rect.left / Math.max(1, radius) + idle;
    }
    // when only the slow idle spin changes, 30fps is plenty
    const key = `${rect.left}|${rect.top}|${rect.width}|${rect.height}|${opacity}`;
    // once a hidden pillar has been cleared there is nothing to redraw
    if (!pillar.visible && !wasVisible) {
      lastKey = key;
    } else if (key !== lastKey || time - drawn > 31 || still) {
      wasVisible = pillar.visible;
      renderer.render(scene, camera);
      drawn = time;
      lastKey = key;
    }
    if (!still && pillar.visible) frame = requestAnimationFrame(render);
  }
  function request() {
    if (!frame && !disposed) frame = requestAnimationFrame(render);
  }

  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    last = 0;
    request();
  });
  canvas.addEventListener("webglcontextlost", () => {
    document.documentElement.classList.remove("pillars-ready");
    document.documentElement.classList.add("no-pillars");
  });
  resize();

  return {
    refresh: request,
    // half the pillar's drawn width, so content can be cut at its surface
    halfWidth: () => half,

    renderNow() {
      cancelAnimationFrame(frame);
      frame = 0;
      render(performance.now());
    },
  };
}
