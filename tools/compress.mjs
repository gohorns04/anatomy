// .cache/build/raw/*.glb → model/*.glb (단순화 + meshopt 압축)
// 실행: node tools/compress.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import { statSync } from 'node:fs';

const RAW = new URL('../.cache/build/raw/', import.meta.url);
const OUT = new URL('../model/', import.meta.url);

// ratio: 남길 삼각형 비율 목표, error: 허용 오차(메시 크기 대비). 각짐이 보이지 않는 범위로 잡는다.
const SETTINGS = {
  skin: { ratio: 0.5, error: 0.001 },
  muscle: { ratio: 0.45, error: 0.002 },
  bone: { ratio: 0.6, error: 0.001 },
  organ: { ratio: 0.6, error: 0.002 },
  vessel: { ratio: 0.7, error: 0.002 },
  nerve: { ratio: 0.5, error: 0.002 },
  insertions: { ratio: 0.5, error: 0.002 },
  female: { ratio: 0.6, error: 0.001 },
};

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

function triangles(doc) {
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      n += (idx ? idx.getCount() : prim.getAttribute('POSITION').getCount()) / 3;
    }
  }
  return n;
}

const only = process.argv.slice(2);
for (const [name, { ratio, error }] of Object.entries(SETTINGS)) {
  if (only.length && !only.includes(name)) continue;
  const doc = await io.read(new URL(`${name}.glb`, RAW).pathname);
  const before = triangles(doc);
  await doc.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error }),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  const out = new URL(`${name}.glb`, OUT).pathname;
  await io.write(out, doc);
  console.log(`${name}: tris ${before} -> ${triangles(doc)}, ${(statSync(out).size / 1048576).toFixed(1)}MB`);
}
