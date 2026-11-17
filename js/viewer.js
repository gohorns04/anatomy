// three.js 장면: 층별 모델 로딩, 재질, 선택 강조, 이는곳·닿는곳 표시, 탭 선택
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const COLORS = {
  skin: 0xe3b598,
  muscle: 0xa8473c,
  bone: 0xe9dfc8,
  organ: 0xc98b7f,
  artery: 0xc0392b,
  vein: 0x3d5a9e,
  nerve: 0xe8c547,
};
const SELECT = 0x00a5b5;
const ORIGIN = 0xd7263d;
const INSERTION = 0x1f6fd1;
const GHOST_OPACITY = 0.15;
const TAP_SLOP = 6; // px
const DOUBLE_TAP_MS = 320;

function baseMaterial(color, layer) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: layer === 'bone' ? 0.75 : 0.55,
    metalness: 0,
    side: THREE.FrontSide,
  });
}

function ghostOf(material) {
  const m = material.clone();
  m.transparent = true;
  m.opacity = GHOST_OPACITY;
  m.depthWrite = false;
  return m;
}

// gltf 원본 노드 이름 → 메시 객체. GLTFLoader는 object.name의 공백·마침표를 바꾸고,
// 형상을 공유하는 노드(좌우 대칭)의 복제본은 parser.associations에 없어서 노드 번호로 직접 꺼낸다.
async function originalNames(gltf) {
  const names = new Map();
  const nodes = gltf.parser.json.nodes || [];
  await Promise.all(nodes.map(async (node, i) => {
    if (node.mesh === undefined) return;
    const obj = await gltf.parser.getDependency('node', i);
    obj.traverse((o) => { if (o.isMesh) names.set(o, node.name); });
  }));
  return names;
}

export function createViewer(canvas, { onPick, isPickable, index }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 30);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa2ad, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(1.5, 2.5, 3);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 0.8);
  rim.position.set(-2, 1.5, -2.5);
  scene.add(key, rim);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.minDistance = 0.25;
  controls.maxDistance = 8;
  controls.zoomToCursor = true;

  const HOME_TARGET = new THREE.Vector3(0, 0.9, 0);
  function resetView() {
    const fit = 1.95 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const dist = camera.aspect < 0.75 ? fit * (0.75 / camera.aspect) * 0.9 : fit;
    controls.target.copy(HOME_TARGET);
    camera.position.set(0, 0.95, dist);
    controls.update();
    dirty = true;
  }

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const meshes = new Map(); // name → mesh
  const materials = {}; // layer|artery|vein → { base, ghost }
  const layerStates = {};
  let hidden = new Set();
  let selected = null;
  let selectedMaterial = null;
  const markers = new Map(); // insertion name → mesh
  let dirty = true;

  function materialsFor(kind) {
    if (!materials[kind]) {
      const base = baseMaterial(COLORS[kind], kind);
      materials[kind] = { base, ghost: ghostOf(base) };
    }
    return materials[kind];
  }

  const kindOf = (name, layer) => (layer === 'vessel' ? (/vein|venous|sinus/i.test(name) ? 'vein' : 'artery') : layer);

  function applyMesh(name) {
    const mesh = meshes.get(name);
    if (!mesh) return;
    const layer = mesh.userData.layer;
    const state = layerStates[layer] ?? 'off';
    mesh.visible = state !== 'off' && !hidden.has(name);
    const mats = materialsFor(mesh.userData.kind);
    if (name === selected) {
      if (!selectedMaterial) {
        selectedMaterial = mats.base.clone();
        selectedMaterial.color = new THREE.Color(SELECT);
        selectedMaterial.emissive = new THREE.Color(SELECT);
        selectedMaterial.emissiveIntensity = 0.25;
      }
      mesh.material = selectedMaterial;
      mesh.visible = !hidden.has(name) && state !== 'off';
      mesh.renderOrder = 2;
    } else {
      mesh.material = state === 'ghost' ? mats.ghost : mats.base;
      mesh.renderOrder = state === 'ghost' ? 1 : 0;
    }
  }

  function loadGlb(url, onProgress) {
    return new Promise((resolve, reject) => {
      loader.load(url, resolve, (e) => onProgress?.(e.loaded, e.total), reject);
    });
  }

  async function loadLayer(layer, onProgress) {
    const gltf = await loadGlb(`model/${layer}.glb`, onProgress);
    const names = await originalNames(gltf);
    const group = new THREE.Group();
    group.name = layer;
    for (const [obj, name] of names) {
      obj.userData.name = name;
      obj.userData.layer = layer;
      obj.userData.kind = kindOf(name, layer);
      meshes.set(name, obj);
    }
    group.add(gltf.scene);
    scene.add(group);
    for (const name of names.values()) applyMesh(name);
    dirty = true;
  }

  async function loadInsertions() {
    const gltf = await loadGlb('model/insertions.glb');
    const names = await originalNames(gltf);
    const originMat = new THREE.MeshBasicMaterial({ color: ORIGIN, depthTest: false, transparent: true, opacity: 0.92 });
    const insertionMat = new THREE.MeshBasicMaterial({ color: INSERTION, depthTest: false, transparent: true, opacity: 0.92 });
    for (const [obj, name] of names) {
      obj.material = /\.o[lr]?$/.test(name) ? originMat : insertionMat;
      obj.renderOrder = 10;
      obj.visible = false;
      markers.set(name, obj);
    }
    scene.add(gltf.scene);
    return [...names.values()];
  }

  function showInsertions({ origins = [], insertions = [] } = {}) {
    const on = new Set([...origins, ...insertions]);
    for (const [name, mesh] of markers) mesh.visible = on.has(name);
    dirty = true;
  }

  function setLayerState(layer, state) {
    layerStates[layer] = state;
    for (const [name, mesh] of meshes) if (mesh.userData.layer === layer) applyMesh(name);
    dirty = true;
  }

  function setHidden(names) {
    const before = hidden;
    hidden = new Set(names);
    for (const name of new Set([...before, ...hidden])) applyMesh(name);
    dirty = true;
  }

  function setSelected(name) {
    const prev = selected;
    selected = name;
    selectedMaterial = null;
    if (prev) applyMesh(prev);
    if (name) applyMesh(name);
    dirty = true;
  }

  // ── 탭 선택 ──
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  let lastTap = 0;

  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const candidates = [];
    for (const [name, mesh] of meshes) if (mesh.visible && isPickable(name, layerStates, hidden)) candidates.push(mesh);
    const hit = raycaster.intersectObjects(candidates, false)[0];
    return hit ? hit.object.userData.name : null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    down = e.isPrimary ? { x: e.clientX, y: e.clientY, multi: false } : null;
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary && down) down.multi = true;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || !e.isPrimary || down.multi) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > TAP_SLOP) return;
    const now = performance.now();
    if (now - lastTap < DOUBLE_TAP_MS) {
      lastTap = 0;
      resetView();
      return;
    }
    lastTap = now;
    onPick(pickAt(e.clientX, e.clientY));
  });

  // ── 크기와 렌더 루프 ──
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dirty = true;
    }
  }
  window.addEventListener('resize', resize);
  controls.addEventListener('change', () => { dirty = true; });

  function frame() {
    resize();
    controls.update();
    if (dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    requestAnimationFrame(frame);
  }
  resize();
  resetView();
  requestAnimationFrame(frame);

  if (new URLSearchParams(location.search).has('debug')) window.__viewer = { THREE, scene, camera, renderer, meshes };

  return { loadLayer, loadInsertions, setLayerState, setHidden, setSelected, showInsertions, resetView };
}
