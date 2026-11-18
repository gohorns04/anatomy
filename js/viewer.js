// three.js 장면: 층별 모델 로딩, 재질, 선택 강조, 이는곳·닿는곳 표시, 탭 선택
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createTapHandler } from './tap.js';
import { focusDistance, clampTargetY, thumbFromView, targetYFromThumb } from './camera-math.js';

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
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 30; // px

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

export function createViewer(canvas, { onPick, isPickable, index, onViewChange }) {
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
  controls.screenSpacePanning = true;

  const HOME_TARGET = new THREE.Vector3(0, 0.9, 0);
  function resetView() {
    const fit = 1.95 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    // 세로 화면은 폭에 맞추고, 가로 화면은 위쪽 층 버튼에 머리가 걸리지 않게 조금 물러난다.
    const dist = camera.aspect < 0.75 ? fit * (0.75 / camera.aspect) * 0.9 : fit * 1.18;
    flight = null;
    controls.target.copy(HOME_TARGET);
    camera.position.set(0, 0.95, dist);
    controls.update();
    dirty = true;
  }

  // ── 카메라 이동 ──
  let flight = null; // { from:{pos,target}, to:{pos,target}, start, ms }
  function flyTo(target, position, ms = 450) {
    flight = { from: { pos: camera.position.clone(), target: controls.target.clone() }, to: { pos: position, target }, start: performance.now(), ms };
    dirty = true;
  }
  function stepFlight(now) {
    if (!flight) return;
    const t = Math.min(1, (now - flight.start) / flight.ms);
    const k = 1 - (1 - t) ** 3;
    camera.position.lerpVectors(flight.from.pos, flight.to.pos, k);
    controls.target.lerpVectors(flight.from.target, flight.to.target, k);
    if (t >= 1) flight = null;
    dirty = true;
  }

  function moveVertically(dy) {
    const target = controls.target.clone();
    const newY = clampTargetY(target.y + dy);
    const shift = newY - target.y;
    controls.target.y += shift;
    camera.position.y += shift;
    controls.update();
    dirty = true;
  }

  // 세로 스크롤바용: 지금 보이는 몸 구간과, 막대 위치로 시점 옮기기
  const visibleHeight = () => 2 * camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  function viewSlice() {
    return thumbFromView(controls.target.y, visibleHeight());
  }
  function scrollToThumb(start) {
    flight = null;
    moveVertically(targetYFromThumb(start, visibleHeight()) - controls.target.y);
  }

  function focusOn(name) {
    const mesh = meshes.get(name);
    if (!mesh) return;
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const dist = focusDistance(Math.max(size.x, size.y, size.z), camera.fov, camera.aspect);
    const dir = camera.position.clone().sub(controls.target).normalize();
    flyTo(center, center.clone().add(dir.multiplyScalar(dist)));
  }

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const meshes = new Map(); // name → mesh
  const materials = {}; // layer|artery|vein → { base, ghost }
  const layerStates = {};
  let hidden = new Set();
  let selected = null;
  let selectedMaterial = null;
  const markers = new Map(); // insertion name → [선명한 메시, 비쳐 보이는 메시]
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
    // 두 번 그린다: 가려지지 않은 곳은 선명하게(깊이 검사, 뼈 표면 위로 살짝 당김),
    // 가려진 곳은 흐리게 비쳐 보이게(깊이 검사 없음). 근육이 자기 부착부를 덮어도 위치를 알 수 있다.
    const front = (color) => new THREE.MeshBasicMaterial({ color, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const through = (color) => new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true, opacity: 0.35 });
    const mats = { o: [front(ORIGIN), through(ORIGIN)], e: [front(INSERTION), through(INSERTION)] };
    for (const [obj, name] of names) {
      const [solid, faint] = mats[/\.o[lr]?$/.test(name) ? 'o' : 'e'];
      const ghost = obj.clone();
      obj.material = solid;
      obj.renderOrder = 9;
      ghost.material = faint;
      ghost.renderOrder = 10;
      obj.parent.add(ghost);
      obj.visible = ghost.visible = false;
      markers.set(name, [obj, ghost]);
    }
    scene.add(gltf.scene);
    return [...names.values()];
  }

  function showInsertions({ origins = [], insertions = [] } = {}) {
    const on = new Set([...origins, ...insertions]);
    for (const [name, pair] of markers) for (const m of pair) m.visible = on.has(name);
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
    if (name === selected) return;
    const prev = selected;
    selected = name;
    selectedMaterial?.dispose();
    selectedMaterial = null;
    if (prev) applyMesh(prev);
    if (name) applyMesh(name);
    dirty = true;
  }

  // ── 탭 선택 ──
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  const tap = createTapHandler({
    onSingle: (x, y) => onPick(pickAt(x, y)),
    onDouble: () => resetView(),
    delay: DOUBLE_TAP_MS,
    slop: DOUBLE_TAP_SLOP,
  });

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
    if (e.isPrimary) down = { x: e.clientX, y: e.clientY, multi: false };
    else if (down) down.multi = true;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || !e.isPrimary || down.multi) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved <= TAP_SLOP) tap(e.clientX, e.clientY);
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

  function frame(now) {
    resize();
    stepFlight(now ?? performance.now());
    controls.update();
    if (dirty) {
      renderer.render(scene, camera);
      onViewChange?.(viewSlice());
      dirty = false;
    }
    requestAnimationFrame(frame);
  }
  resize();
  resetView();
  requestAnimationFrame(frame);

  if (new URLSearchParams(location.search).has('debug')) window.__viewer = { THREE, scene, camera, renderer, meshes };

  return { loadLayer, loadInsertions, setLayerState, setHidden, setSelected, showInsertions, resetView, focusOn, scrollToThumb };
}
