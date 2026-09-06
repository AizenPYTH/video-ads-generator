#!/usr/bin/env node
/**
 * Turns the source iPhone GLB into the runtime asset the engine loads.
 *
 *   node scripts/prepare-devices.mjs            (run from backend/)
 *
 * Source:  ../iphone_15_pro.glb   (Sketchfab, 4.7 MB, never modified)
 * Output:  remotion/public/models/iphone-15-pro.glb
 *          ../frontend/public/models/iphone-15-pro.glb   (same bytes)
 *
 * What it does, and why:
 *  - Splits the front face of the outer glass into its own mesh named
 *    "Screen" with planar UVs (0..1 across the glass). The artist's UVs point
 *    at a baked wallpaper; ours let a canvas texture land exactly on the
 *    display, whatever the source's atlas looked like.
 *  - Names every part so the runtime can address them: Body, BackPlate,
 *    Glass, Screen, CameraBump, LensGlass, Antenna, Inner.
 *  - Textures to WebP and down to 1024 where the source was 2048: the frame
 *    is ~30 px wide on a 1080p phone shot, 2048 is wasted bytes. The roughness
 *    map is flat and goes to 256.
 *  - Quantizes geometry (KHR_mesh_quantization - no decoder needed) and
 *    prunes what nothing references.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { NodeIO, Primitive } from "@gltf-transform/core";
import { KHRMeshQuantization, EXTTextureWebP } from "@gltf-transform/extensions";
import { dedup, prune, quantize, textureCompress, resample } from "@gltf-transform/functions";

const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(here, "..");
const SOURCE = path.resolve(backend, "..", "iphone_15_pro.glb");
const OUT = path.resolve(backend, "remotion", "public", "models", "iphone-15-pro.glb");
const FRONTEND_OUT = path.resolve(backend, "..", "frontend", "public", "models", "iphone-15-pro.glb");

/** Mesh name in the source → part name at runtime. */
const PART_NAMES = {
  Object_0: "Inner",
  Object_1: "Body",
  Object_2: "Glass",
  Object_3: "LensGlass",
  Object_4: "Antenna",
  Object_5: "BackPlate",
  Object_6: "Frame",
  Object_7: "CameraBump",
};

/** A triangle is screen if it lies on the front plane (local y ≈ 0) facing -y. */
const FRONT_Y_MAX = 0.6;
const FRONT_NORMAL_Y_MAX = -0.7;

const io = new NodeIO().registerExtensions([KHRMeshQuantization, EXTTextureWebP]);
const doc = await io.read(SOURCE);
const root = doc.getRoot();

// ── 1. Name the parts ──────────────────────────────────────────────────
for (const mesh of root.listMeshes()) {
  const name = PART_NAMES[mesh.getName()];
  if (name) mesh.setName(name);
}
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (mesh) node.setName(mesh.getName());
}

// ── 2. Split the screen out of the glass ───────────────────────────────
const glassMesh = root.listMeshes().find((m) => m.getName() === "Glass");
if (!glassMesh) throw new Error("Glass mesh not found - has the source changed?");
const glassPrim = glassMesh.listPrimitives()[0];
const pos = glassPrim.getAttribute("POSITION");
const nrm = glassPrim.getAttribute("NORMAL");
const uv = glassPrim.getAttribute("TEXCOORD_0");
const idx = glassPrim.getIndices();

const P = pos.getArray();
const N = nrm.getArray();
const U = uv.getArray();
const I = idx.getArray();

const screenTris = [];
const otherTris = [];
for (let t = 0; t < I.length; t += 3) {
  const a = I[t], b = I[t + 1], c = I[t + 2];
  const onFront = [a, b, c].every((v) => P[v * 3 + 1] <= FRONT_Y_MAX && N[v * 3 + 1] <= FRONT_NORMAL_Y_MAX);
  (onFront ? screenTris : otherTris).push(a, b, c);
}
if (screenTris.length < 30) throw new Error(`Only ${screenTris.length / 3} screen triangles found`);

/** Builds a primitive from a subset of triangles, remapping vertices. */
function subset(tris, remapUv) {
  const map = new Map();
  const p = [], n = [], u = [], ind = [];
  for (const v of tris) {
    let j = map.get(v);
    if (j === undefined) {
      j = map.size;
      map.set(v, j);
      p.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
      n.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]);
      u.push(U[v * 2], U[v * 2 + 1]);
    }
    ind.push(j);
  }
  if (remapUv) {
    // Planar projection over the part's own bounds: u across width (x),
    // v down the height (z, top of the phone = v 0). glTF v=0 is the top
    // of the image, and the phone's top is +z in the source's local frame.
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let k = 0; k < p.length; k += 3) {
      minX = Math.min(minX, p[k]); maxX = Math.max(maxX, p[k]);
      minZ = Math.min(minZ, p[k + 2]); maxZ = Math.max(maxZ, p[k + 2]);
    }
    for (let k = 0, m = 0; k < p.length; k += 3, m += 2) {
      u[m] = (p[k] - minX) / (maxX - minX);
      u[m + 1] = (maxZ - p[k + 2]) / (maxZ - minZ);
    }
    console.log(`screen bounds: width ${(maxX - minX).toFixed(2)} mm, height ${(maxZ - minZ).toFixed(2)} mm`);
  }
  const buffer = root.listBuffers()[0];
  const prim = doc.createPrimitive()
    .setMode(Primitive.Mode.TRIANGLES)
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(p)).setBuffer(buffer))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(n)).setBuffer(buffer))
    .setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(new Float32Array(u)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(ind)).setBuffer(buffer));
  return prim;
}

const glassMaterial = glassPrim.getMaterial();
const screenMaterial = doc.createMaterial("Screen")
  .setBaseColorFactor([0.02, 0.02, 0.025, 1])
  .setMetallicFactor(0)
  .setRoughnessFactor(0.25);

const screenPrim = subset(screenTris, true).setMaterial(screenMaterial);
const restPrim = subset(otherTris, false).setMaterial(glassMaterial);

// Replace the glass primitive with the back-only remainder; add Screen as a sibling node.
glassMesh.removePrimitive(glassPrim);
glassMesh.addPrimitive(restPrim);
glassPrim.dispose();

const screenMesh = doc.createMesh("Screen").addPrimitive(screenPrim);
const glassNode = root.listNodes().find((n) => n.getMesh() === glassMesh);
const parent = root.listNodes().find((n) => n.listChildren().includes(glassNode));
const screenNode = doc.createNode("Screen").setMesh(screenMesh);
parent.addChild(screenNode);
console.log(`screen: ${screenTris.length / 3} triangles, glass remainder: ${otherTris.length / 3}`);

// ── 3. Materials: sensible PBR for the runtime lights ──────────────────
for (const mat of root.listMaterials()) {
  const name = mat.getName();
  if (name === "Glass_-_Heavy_Color") { mat.setRoughnessFactor(0.08).setMetallicFactor(0); }
  if (name === "Titanium_-_Polished") { mat.setMetallicFactor(0.9).setRoughnessFactor(0.35); }
  if (name === "Titanium_-_Satin") { mat.setMetallicFactor(0.85).setRoughnessFactor(0.45); }
  if (name === "Aluminum_-_Polished") { mat.setMetallicFactor(0.9).setRoughnessFactor(0.3); }
  if (name === "Aluminum_-_Bead_Blasted") { mat.setMetallicFactor(0.8).setRoughnessFactor(0.55); }
  if (name === "Aluminum_-_Satin") { mat.setMetallicFactor(0.6).setRoughnessFactor(0.6); }
}

// ── 4. Optimise ────────────────────────────────────────────────────────
await doc.transform(
  dedup(),
  resample(),
  textureCompress({ encoder: sharp, targetFormat: "webp", quality: 82, resize: [1024, 1024] }),
  quantize(),
  // keepAttributes: without it prune() strips UVs from any primitive whose
  // material has no texture - which is exactly the Screen we just made,
  // whose texture arrives at runtime.
  prune({ keepAttributes: true }),
);
// The roughness map is flat grey: 256 px says the same thing.
for (const tex of root.listTextures()) {
  const slots = doc.getGraph().listParentEdges(tex).map((e) => e.getName());
  if (slots.includes("metallicRoughnessTexture")) {
    const small = await sharp(tex.getImage()).resize(256, 256).webp({ quality: 80 }).toBuffer();
    tex.setImage(small).setMimeType("image/webp");
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
await io.write(OUT, doc);
fs.mkdirSync(path.dirname(FRONTEND_OUT), { recursive: true });
fs.copyFileSync(OUT, FRONTEND_OUT);
const size = fs.statSync(OUT).size;
console.log(`wrote ${path.relative(backend, OUT)} (${(size / 1024).toFixed(0)} KB) + frontend copy`);
