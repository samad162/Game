import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const container = document.getElementById('gameContainer');
const driverSelect = document.getElementById('driverSelect');
const driverName = document.getElementById('driverName');
const speedValue = document.getElementById('speedValue');
const nitroValue = document.getElementById('nitroValue');
const sessionValue = document.getElementById('sessionValue');
const safetyOverlay = document.getElementById('safetyOverlay');
const restartBtn = document.getElementById('restartBtn');

const SESSION_MS = 2 * 60 * 60 * 1000;
const keys = new Set();

const state = {
  speed: 0,
  nitro: 100,
  steering: 0,
  roadOffset: 0,
  timeLeft: SESSION_MS,
  running: true,
  dayClock: 0,
};

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x6ba7ff, 120, 520);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 6.5, 16);

const hemi = new THREE.HemisphereLight(0xbfe0ff, 0x1e2230, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.45);
sun.position.set(60, 70, 30);
scene.add(sun);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(900, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0x8dc2ff, side: THREE.BackSide })
);
scene.add(sky);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(2200, 2200),
  new THREE.MeshStandardMaterial({ color: 0x2d5c2f, roughness: 0.95, metalness: 0.03 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
scene.add(ground);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(24, 2000),
  new THREE.MeshStandardMaterial({ color: 0x21242c, roughness: 0.8, metalness: 0.12 })
);
road.rotation.x = -Math.PI / 2;
road.position.z = -950;
scene.add(road);

const laneLines = [];
for (let i = 0; i < 65; i++) {
  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, 6),
    new THREE.MeshBasicMaterial({ color: 0xf3f3f3 })
  );
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.02, -i * 30);
  scene.add(line);
  laneLines.push(line);
}

const roadLights = [];
for (let side of [-1, 1]) {
  for (let i = 0; i < 28; i++) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 7.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x5f687b, roughness: 0.7 })
    );
    pole.position.set(side * 14, 3.75, -i * 70 - 30);
    scene.add(pole);

    const bulb = new THREE.PointLight(0x9fd9ff, 0.8, 28, 2);
    bulb.position.set(side * 14, 7.8, -i * 70 - 30);
    scene.add(bulb);
    roadLights.push(bulb);
  }
}

function createMountain(x, z, s) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(18 * s, 28 * s, 5),
    new THREE.MeshStandardMaterial({ color: 0x4f5962, roughness: 1 })
  );
  mesh.position.set(x, 12 * s, z);
  scene.add(mesh);
}
for (let i = 0; i < 24; i++) {
  createMountain((Math.random() - 0.5) * 260, -80 - i * 75, 0.7 + Math.random() * 1.3);
}

const car = new THREE.Group();
const carBody = new THREE.Mesh(
  new THREE.BoxGeometry(3.2, 0.9, 6.3),
  new THREE.MeshStandardMaterial({ color: 0xd11528, metalness: 0.55, roughness: 0.25 })
);
carBody.position.y = 1.05;
car.add(carBody);

const cabin = new THREE.Mesh(
  new THREE.BoxGeometry(2.25, 0.7, 2.6),
  new THREE.MeshStandardMaterial({ color: 0x161d2e, metalness: 0.65, roughness: 0.18 })
);
cabin.position.set(0, 1.7, -0.2);
car.add(cabin);

const wheelGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.48, 20);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
for (const [x, z] of [[-1.4, 2.1], [1.4, 2.1], [-1.4, -2.1], [1.4, -2.1]]) {
  const w = new THREE.Mesh(wheelGeo, wheelMat);
  w.rotation.z = Math.PI / 2;
  w.position.set(x, 0.55, z);
  car.add(w);
}

const tailGlowMat = new THREE.MeshBasicMaterial({ color: 0x00eaff });
const leftNitro = new THREE.Mesh(new THREE.ConeGeometry(0.23, 1.4, 12), tailGlowMat);
const rightNitro = leftNitro.clone();
leftNitro.rotation.x = Math.PI / 2;
rightNitro.rotation.x = Math.PI / 2;
leftNitro.position.set(-0.6, 0.95, 3.35);
rightNitro.position.set(0.6, 0.95, 3.35);
leftNitro.visible = false;
rightNitro.visible = false;
car.add(leftNitro, rightNitro);

car.position.set(0, 0, 8);
scene.add(car);

const chaseLight = new THREE.PointLight(0x66f6ff, 0, 35, 2);
chaseLight.position.set(0, 1.1, 4.2);
car.add(chaseLight);

function formatTime(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(t / 3600)).padStart(2, '0');
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
  const s = String(t % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function updateUI() {
  speedValue.textContent = `${String(Math.round(state.speed)).padStart(3, '0')} km/h`;
  nitroValue.textContent = `${Math.round(state.nitro)}%`;
  sessionValue.textContent = formatTime(state.timeLeft);
}

function updateDayNight(dt) {
  state.dayClock += dt * 0.000018;
  const phase = (Math.sin(state.dayClock) + 1) * 0.5;
  const isNight = phase < 0.42;

  const daySky = new THREE.Color(0x8ec7ff);
  const nightSky = new THREE.Color(0x050914);
  sky.material.color.copy(daySky).lerp(nightSky, isNight ? 0.92 : 0.08);

  scene.fog.color.set(isNight ? 0x090f1e : 0x6ba7ff);
  scene.fog.near = isNight ? 90 : 120;
  scene.fog.far = isNight ? 420 : 520;

  const sunI = isNight ? 0.18 : 1.45;
  const hemiI = isNight ? 0.35 : 1.1;
  sun.intensity = sunI;
  hemi.intensity = hemiI;
  ground.material.color.set(isNight ? 0x1c2d23 : 0x2d5c2f);

  for (const lamp of roadLights) {
    lamp.intensity = isNight ? 1.45 : 0.25;
    lamp.color.set(isNight ? 0x7fd1ff : 0xffefc2);
  }

  return isNight;
}

let last = performance.now();
function loop(now) {
  const dt = now - last;
  last = now;

  if (state.running) {
    const accel = keys.has('w') ? 0.06 : -0.025;
    const brake = keys.has('s') ? -0.09 : 0;
    const nitroOn = keys.has('Shift') && state.nitro > 0 && state.speed > 40;

    state.speed = THREE.MathUtils.clamp(state.speed + (accel + brake + (nitroOn ? 0.12 : 0)) * dt, 0, 360);

    const steerTarget = (keys.has('a') ? -1 : 0) + (keys.has('d') ? 1 : 0);
    state.steering = THREE.MathUtils.lerp(state.steering, steerTarget, 0.08);
    car.position.x = THREE.MathUtils.clamp(car.position.x + state.steering * dt * 0.0078, -8.2, 8.2);
    car.rotation.y = -state.steering * 0.18;

    if (nitroOn) state.nitro = Math.max(0, state.nitro - dt * 0.035);
    else state.nitro = Math.min(100, state.nitro + dt * 0.015);

    leftNitro.visible = nitroOn;
    rightNitro.visible = nitroOn;
    chaseLight.intensity = nitroOn ? 2.2 : 0;

    state.roadOffset += state.speed * dt * 0.12;
    for (const [i, l] of laneLines.entries()) {
      l.position.z = ((state.roadOffset - i * 30) % 1950) - 975;
      l.material.color.set(nitroOn ? 0x5efcff : 0xf3f3f3);
    }

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, car.position.x * 0.3, 0.08);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 6.3 + state.speed * 0.005, 0.05);
    camera.lookAt(car.position.x * 0.2, 1.2, -25);

    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.running = false;
      state.speed = 0;
      safetyOverlay.classList.remove('hidden');
    }
  }

  updateDayNight(dt);
  updateUI();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keydown', (e) => {
  if (['w', 'a', 's', 'd', 'Shift'].includes(e.key)) {
    keys.add(e.key);
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key));

driverSelect.addEventListener('change', (e) => {
  driverName.textContent = e.target.value;
  const toneMap = {
    'Astra Vega': 0xd11528,
    'Kairo Flux': 0x1f7aff,
    'Nova Dray': 0x8d4dff,
    'Ryder Quinn': 0x13c26f,
  };
  carBody.material.color.setHex(toneMap[e.target.value] ?? 0xd11528);
});

restartBtn.addEventListener('click', () => {
  state.running = true;
  state.timeLeft = SESSION_MS;
  state.nitro = 100;
  state.speed = 0;
  safetyOverlay.classList.add('hidden');
});

updateUI();
requestAnimationFrame(loop);
