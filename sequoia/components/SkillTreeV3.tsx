'use client';

import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { useRouter } from 'next/navigation';
import { FORUM_CATEGORIES, type ForumCategorySlug } from '@/lib/forum';
import { useRef, useState, useCallback, useEffect, useMemo, memo, type Dispatch, type SetStateAction } from 'react';
import * as THREE from 'three';

const ORTHO_CAM_Z = 22;
const DRAG_THRESHOLD = 5;
const BLACK = new THREE.Color(0x000000);
const TILT_X = 1.6;
const TILT_Y = 0; // vertical tilt causes z-depth-dependent floating; horizontal parallax is sufficient
const LERP_MOUSE = 0.05;
const Z_SCALE = 1.8;
const ZOOM_FACTOR = 0.0012;   // zoom speed per pixel of deltaY
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 6;
const NODE_CLICK_ZOOM = 0.28; // target zoom when clicking a node
const LERP_ZOOM = 0.09;       // animation speed for click-to-zoom
/** Horizon color — matches the sky/ground backdrop at the horizon line */
const BACKGROUND_COLOR = '#c4d6d0';
const FOG_COLOR = '#c4d6d0';
const BLOOM_INTENSITY = 1.2;
const BLOOM_RADIUS = 0.6;
const BLOOM_THRESHOLD = 0.9;

// ─── Tree generation (2D layout → z lift) ───────────────────

interface NodeDef {
  id: number;
  parentId: number | null;
  depth: number;
  family: number;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
}

interface NodeTarget {
  href: string;
  skill: string;
  levelLabel: string;
  detail: string;
  categorySlug: ForumCategorySlug | 'forum';
  subsectionSlug: string | null;
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const SIZES = [0.28, 0.23, 0.21, 0.2, 0.19, 0.18, 0.18];
const Y_STEP = 1.35;
const TREE_W = 19;
// Z_SCALE defined above with other camera constants
const Z_MAX_ACC = 5;
const SKILL_BASE_COLORS = ['#6ec5ff', '#7ad78f', '#ff9966', '#f7be4b', '#c79dff', '#4cd7c2', '#ff7ca2', '#9fd06f', '#73a1ff'];

const SKILL_LEVELS = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'];

interface SkillPath {
  skill: string;
  categorySlug: ForumCategorySlug;
  levels: Array<{
    label: string;
    href: string;
    detail: string;
    subsectionSlug: string | null;
  }>;
}

function buildSkillPaths(): SkillPath[] {
  const paths: SkillPath[] = [];
  for (const category of FORUM_CATEGORIES) {
    if (category.slug === 'life-advice') {
      paths.push({
        skill: category.label,
        categorySlug: category.slug,
        levels: category.subsections.map((sub) => ({
          label: sub.label,
          href: `/forum/life-advice/${sub.slug}`,
          detail: sub.description,
          subsectionSlug: sub.slug,
        })),
      });
      continue;
    }

    for (const sub of category.subsections) {
      paths.push({
        skill: sub.label,
        categorySlug: category.slug,
        levels: SKILL_LEVELS.map((levelLabel, li) => ({
          label: levelLabel,
          href: `/forum/technical-advice/${sub.slug}`,
          detail: `${sub.description} Progress tier ${li + 1}.`,
          subsectionSlug: sub.slug,
        })),
      });
    }
  }
  return paths;
}

const SKILL_PATHS = buildSkillPaths();

function toneColor(hex: string, depth: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, THREE.MathUtils.clamp(hsl.s + 0.06, 0, 1), THREE.MathUtils.clamp(hsl.l + depth * 0.045, 0.25, 0.84));
  return `#${c.getHexString()}`;
}

function buildLinearTree2D(): { nodes: Omit<NodeDef, 'z'>[]; targets: Record<number, NodeTarget> } {
  const nodes: Omit<NodeDef, 'z'>[] = [];
  const targets: Record<number, NodeTarget> = {};

  let id = 0;
  const rootId = id++;
  nodes.push({
    id: rootId,
    parentId: null,
    depth: 0,
    family: -1,
    x: 0,
    y: 0,
    color: '#ffd54f',
    size: 0.32,
  });
  targets[rootId] = {
    href: '/forum',
    skill: 'Forum Root',
    levelLabel: 'Root',
    detail: 'Entry point for every skill forum path.',
    categorySlug: 'forum',
    subsectionSlug: null,
  };

  const count = SKILL_PATHS.length;
  const xStep = count > 1 ? TREE_W / (count - 1) : 0;

  for (let pi = 0; pi < count; pi++) {
    const path = SKILL_PATHS[pi];
    const baseX = -TREE_W / 2 + pi * xStep;
    let parentId = rootId;

    for (let li = 0; li < path.levels.length; li++) {
      const level = path.levels[li];
      const nodeId = id++;
      const curveOffset = (hash(pi * 97 + li * 7) - 0.5) * 0.24;
      const drift = (pi - (count - 1) / 2) * 0.02 * li;
      const x = baseX + curveOffset + drift;
      const y = (li + 1) * Y_STEP;
      nodes.push({
        id: nodeId,
        parentId,
        depth: li + 1,
        family: pi,
        x,
        y,
        color: toneColor(SKILL_BASE_COLORS[pi % SKILL_BASE_COLORS.length], li),
        size: SIZES[Math.min(li + 1, SIZES.length - 1)],
      });
      targets[nodeId] = {
        href: level.href,
        skill: path.skill,
        levelLabel: level.label,
        detail: level.detail,
        categorySlug: path.categorySlug,
        subsectionSlug: level.subsectionSlug,
      };
      parentId = nodeId;
    }
  }

  return { nodes, targets };
}

function liftZ(nodes: Omit<NodeDef, 'z'>[]): number[] {
  const z: number[] = new Array(nodes.length).fill(0);

  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    const pid = n.parentId!;
    const p = nodes[pid];
    const dx = n.x - p.x;
    const dy = n.y - p.y;
    const projLen = Math.hypot(dx, dy) || 1e-6;
    const shortHop = 1 / (1 + projLen * 0.85);
    const sign = hash(n.id * 397 + 77) > 0.5 ? 1 : -1;
    const mag =
      (0.35 + hash(n.id * 151 + 3) * 1.65) * Z_SCALE * (0.45 + shortHop * 1.4);
    const delta = sign * mag;
    z[i] = THREE.MathUtils.clamp(z[pid] + delta, -Z_MAX_ACC, Z_MAX_ACC);
  }

  return z;
}

function buildNodes(): { nodes: NodeDef[]; targets: Record<number, NodeTarget> } {
  const { nodes: base, targets } = buildLinearTree2D();
  const zs = liftZ(base);
  return {
    nodes: base.map((n, i) => ({ ...n, z: zs[i] })),
    targets,
  };
}

const TREE_DATA = buildNodes();
const NODES = TREE_DATA.nodes;
const NODE_TARGETS = TREE_DATA.targets;
const POS: [number, number, number][] = NODES.map((n) => [n.x, n.y, n.z]);
// Branch radii taper strongly with depth so deeper branches look thin/delicate
const BR_R = [0.11, 0.072, 0.048, 0.032, 0.021, 0.014, 0.010];
// Branch colors lighten with depth (darker near root, warmer at tips)
const BR_C = ['#5b341d', '#6a3e22', '#784a2c', '#85573a', '#93644a', '#a07157', '#ad7f66'];
// Roughness + metalness per depth level — slightly smoother than before so bark catches more light
const BR_ROUGHNESS = [0.72, 0.68, 0.64, 0.60, 0.57, 0.54, 0.52];
const BR_METALNESS  = [0.05, 0.07, 0.09, 0.10, 0.11, 0.12, 0.12];

interface BarkTextureSet {
  color: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
}

let barkTextureCache: BarkTextureSet | null = null;

function makeBarkTextures(): BarkTextureSet | null {
  if (typeof document === 'undefined') return null;
  if (barkTextureCache) return barkTextureCache;

  const size = 256;

  const mkCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return canvas;
  };

  const colorCanvas = mkCanvas();
  const bumpCanvas = mkCanvas();
  const roughCanvas = mkCanvas();

  const cctx = colorCanvas.getContext('2d');
  const bctx = bumpCanvas.getContext('2d');
  const rctx = roughCanvas.getContext('2d');
  if (!cctx || !bctx || !rctx) return null;

  const grad = cctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#8c6648');
  grad.addColorStop(0.45, '#9f7858');
  grad.addColorStop(1, '#76553b');
  cctx.fillStyle = grad;
  cctx.fillRect(0, 0, size, size);

  for (let x = 0; x < size; x += 3) {
    const v = Math.floor(45 + hash(x * 13.1) * 55);
    cctx.fillStyle = `rgba(${v + 62}, ${v + 34}, ${v + 10}, 0.2)`;
    cctx.fillRect(x, 0, 1 + ((x / 3) % 2), size);
  }

  for (let i = 0; i < 320; i++) {
    const x = Math.floor(hash(i * 71.3) * size);
    const y = Math.floor(hash(i * 37.9) * size);
    const r = 1 + Math.floor(hash(i * 11.7) * 3);
    cctx.fillStyle = `rgba(56, 36, 24, ${0.04 + hash(i * 3.9) * 0.08})`;
    cctx.beginPath();
    cctx.arc(x, y, r, 0, Math.PI * 2);
    cctx.fill();
  }

  const bumpImg = bctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const ridge = Math.sin((x / size) * Math.PI * 24) * 0.5 + 0.5;
      const grain = hash(x * 17.2 + y * 9.7);
      const v = Math.floor(80 + ridge * 90 + grain * 55);
      bumpImg.data[i] = v;
      bumpImg.data[i + 1] = v;
      bumpImg.data[i + 2] = v;
      bumpImg.data[i + 3] = 255;
    }
  }
  bctx.putImageData(bumpImg, 0, 0);

  const roughImg = rctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const stripe = Math.sin((x / size) * Math.PI * 18) * 0.5 + 0.5;
      const noise = hash(x * 5.1 + y * 13.7);
      const v = Math.floor(120 + stripe * 80 + noise * 35);
      roughImg.data[i] = v;
      roughImg.data[i + 1] = v;
      roughImg.data[i + 2] = v;
      roughImg.data[i + 3] = 255;
    }
  }
  rctx.putImageData(roughImg, 0, 0);

  const color = new THREE.CanvasTexture(colorCanvas);
  const bump = new THREE.CanvasTexture(bumpCanvas);
  const roughness = new THREE.CanvasTexture(roughCanvas);

  [color, bump, roughness].forEach((t) => {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1.1, 6.5);
    t.needsUpdate = true;
  });

  color.colorSpace = THREE.SRGBColorSpace;

  barkTextureCache = { color, bump, roughness };
  return barkTextureCache;
}

const TREE_PAD = 0.85;

function treeAxisBounds() {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of NODES) {
    minX = Math.min(minX, n.x - n.size);
    maxX = Math.max(maxX, n.x + n.size);
    minY = Math.min(minY, n.y - n.size);
    maxY = Math.max(maxY, n.y + n.size);
  }
  return { minX, maxX, minY, maxY };
}

const SKILL_TREE_BOUNDS = treeAxisBounds();

/**
 * Ground / trunk-base line in world Y. Trunk mesh: center y=-0.4, height 0.8 → bottom at -0.8.
 * Frustum bottom is pinned to this so the ground reads as the bottom of the screen (not a mid-air strip).
 */
const FLOOR_LOCAL_Y = -0.8;

/**
 * World-space XY frustum for the front (view) plane — same numbers drive SVG and OrthographicCamera.
 * Projection of any point (x, y, z) onto the view plane is (x, y); z only affects depth/lighting.
 * Vertical framing: bottom edge = floor (tree bases + ground), top from aspect fit.
 */
function orthoFrustumForViewport(
  vw: number,
  vh: number,
  pad = TREE_PAD,
): { left: number; right: number; top: number; bottom: number } {
  if (vw <= 0 || vh <= 0) {
    return { left: -1, right: 1, top: 1, bottom: -1 };
  }
  const { minX, maxX, maxY } = treeAxisBounds();
  const bw = maxX - minX + pad * 2;
  // Include ground padding below the floor so the trunk base is visible above the ground strip
  const groundPad = pad * 1.1;
  const bh = maxY - FLOOR_LOCAL_Y + pad + groundPad;
  const cx = (minX + maxX) / 2;
  const ar = vw / vh;
  const boxAr = bw / bh;
  let halfW: number;
  let halfH: number;
  if (boxAr > ar) {
    halfW = bw / 2;
    halfH = halfW / ar;
  } else {
    halfH = bh / 2;
    halfW = halfH * ar;
  }
  const bottom = FLOOR_LOCAL_Y - groundPad;
  const top = bottom + 2 * halfH;
  return {
    left: cx - halfW,
    right: cx + halfW,
    bottom,
    top,
  };
}

interface ViewState {
  panX: number;
  panY: number;
  zoom: number;
}

const DEFAULT_VIEW: ViewState = { panX: 0, panY: 0, zoom: 1 };

function applyViewState(
  base: { left: number; right: number; top: number; bottom: number },
  vs: ViewState,
): { left: number; right: number; top: number; bottom: number } {
  const baseCx = (base.left + base.right) / 2;
  const baseCy = (base.bottom + base.top) / 2;
  const halfW = ((base.right - base.left) / 2) * vs.zoom;
  const halfH = ((base.top - base.bottom) / 2) * vs.zoom;
  const cx = baseCx + vs.panX;
  const cy = baseCy + vs.panY;
  return { left: cx - halfW, right: cx + halfW, bottom: cy - halfH, top: cy + halfH };
}

/** Three.js ortho planes are in camera space; camera sits at world (cx, cy, z) looking at (cx, cy, 0). */
function worldFrustumToCameraLocal(frustum: {
  left: number;
  right: number;
  top: number;
  bottom: number;
}): { left: number; right: number; top: number; bottom: number; cx: number; cy: number } {
  const { left: wl, right: wr, top: wt, bottom: wb } = frustum;
  const cx = (wl + wr) / 2;
  const cy = (wb + wt) / 2;
  const halfW = (wr - wl) / 2;
  const halfH = (wt - wb) / 2;
  return { left: -halfW, right: halfW, bottom: -halfH, top: halfH, cx, cy };
}

// ─── Background Forest ──────────────────────────────────────

interface BgTreeDef {
  id: number;
  x: number;
  y: number;
  z: number;
  scale: number;
  lean: number;
}

/** Group origin Y so trunk base sits on FLOOR_LOCAL_Y (matches cylinder layout in BackgroundTree) */
function forestTreeGroupY(scale: number): number {
  return FLOOR_LOCAL_Y + 0.7 * scale;
}

/**
 * Structured forest: left + right stands + back row, all planted on the same floor;
 * depth rows use more negative Z for farther trees (smaller scale). Center kept clear for the skill tree.
 */
function buildForestBackgroundTrees(): BgTreeDef[] {
  const out: BgTreeDef[] = [];
  const { minX, maxX } = SKILL_TREE_BOUNDS;
  const cx = (minX + maxX) / 2;
  const halfW = (maxX - minX) / 2 + 0.4;

  let id = 0;

  const leftMin = minX - 14.5;
  const leftMax = minX - 0.95;
  const rightMin = maxX + 0.95;
  const rightMax = maxX + 14.5;

  const zDepths = [-5.2, -6.8, -8.4, -10.2, -12.5, -15, -17.5];

  zDepths.forEach((zBase, zi) => {
    const scaleMul = Math.max(0.42, 1.05 - zi * 0.085);
    const nPerSide = 5 + Math.min(zi, 4);
    for (let side = 0; side < 2; side++) {
      const isLeft = side === 0;
      const xMin = isLeft ? leftMin : rightMin;
      const xMax = isLeft ? leftMax : rightMax;
      for (let i = 0; i < nPerSide; i++) {
        const t = nPerSide > 1 ? i / (nPerSide - 1) : 0.5;
        const x = xMin + t * (xMax - xMin) + (hash(id * 97) - 0.5) * 0.5;
        const scale = (0.52 + hash(id * 673) * 0.48) * scaleMul;
        const z = zBase + (hash(id * 503) - 0.5) * 0.75;
        out.push({
          id: id++,
          x,
          y: forestTreeGroupY(scale),
          z,
          scale,
          lean: (hash(id * 809) - 0.5) * 0.12,
        });
      }
    }
  });

  for (let xi = -23; xi <= 23; xi += 1.45) {
    if (Math.abs(xi - cx) < halfW + 1.0) continue;
    const scale = (0.48 + hash(id * 701) * 0.38) * 0.62;
    out.push({
      id: id++,
      x: xi + (hash(id * 401) - 0.5) * 0.4,
      y: forestTreeGroupY(scale),
      z: -19 + (hash(id * 223) - 0.5) * 1.0,
      scale,
      lean: (hash(id * 809) - 0.5) * 0.1,
    });
  }

  return out;
}

const BG_TREES = buildForestBackgroundTrees();

const BG_FOLIAGE: { x: number; y: number; z: number; r: number; ci: number }[] = [
  { x: 0,     y: 0.55, z: 0,     r: 0.22, ci: 0 },
  { x: -0.20, y: 1.05, z: 0.06,  r: 0.18, ci: 1 },
  { x:  0.22, y: 1.15, z:-0.06,  r: 0.17, ci: 1 },
  { x:  0,    y: 1.65, z: 0,     r: 0.15, ci: 2 },
  { x: -0.14, y: 2.05, z: 0.05,  r: 0.13, ci: 2 },
  { x:  0.15, y: 2.15, z:-0.05,  r: 0.12, ci: 3 },
  { x:  0,    y: 2.55, z: 0,     r: 0.10, ci: 3 },
];

const BG_FOLIAGE_COLORS = ['#3d8a72', '#4a9a78', '#3d7a8a', '#4a8a6a'];

/**
 * Backdrop plane centered on FLOOR_LOCAL_Y.
 * vUv.y == 0.5  → horizon / floor line
 * vUv.y  > 0.5  → sky  (0.5 = horizon, 1.0 = zenith)
 * vUv.y  < 0.5  → ground (0.5 = horizon, 0.0 = deep earth)
 * This means the void *below* the floor always shows ground color,
 * so zooming out never reveals empty space.
 */
const BACKDROP_VS = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const BACKDROP_FS = `
  varying vec2 vUv;
  void main() {
    float t = vUv.y; // 0 = bottom, 1 = top, 0.5 = horizon
    vec3 col;
    if (t >= 0.5) {
      float s = (t - 0.5) * 2.0; // 0 at horizon, 1 at zenith
      vec3 horizon = vec3(0.77, 0.84, 0.82);
      vec3 zenith  = vec3(0.54, 0.69, 0.80);
      col = mix(horizon, zenith, pow(s, 0.75));
    } else {
      float s = t * 2.0; // 0 at deep earth, 1 at horizon
      vec3 earth   = vec3(0.18, 0.26, 0.22);
      vec3 horizon = vec3(0.42, 0.54, 0.48);
      col = mix(earth, horizon, pow(s, 0.6));
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

const BackgroundTree = memo(function BackgroundTree({ tree }: { tree: BgTreeDef }) {
  const { x, y, z, scale, lean } = tree;
  return (
    <group position={[x, y, z]} rotation={[0, 0, lean]}>
      <mesh position={[0, -0.35 * scale, 0]}>
        <cylinderGeometry args={[0.03 * scale, 0.065 * scale, 0.7 * scale, 5]} />
        <meshBasicMaterial color="#2d4a3a" transparent opacity={0.88} />
      </mesh>
      {BG_FOLIAGE.map((f, i) => (
        <mesh key={i} position={[f.x * scale, f.y * scale, f.z * scale]}>
          <sphereGeometry args={[f.r * scale, 8, 8]} />
          <meshBasicMaterial
            color={BG_FOLIAGE_COLORS[f.ci % BG_FOLIAGE_COLORS.length]}
            transparent
            opacity={0.82}
          />
        </mesh>
      ))}
    </group>
  );
});

/**
 * Sky+ground backdrop centered on FLOOR_LOCAL_Y.
 *
 * Placed at z = -1 (one unit behind the origin, just behind the trunk at z≈-0.3).
 * Keeping it close to the trunk's Z means camera-tilt parallax between the backdrop's
 * horizon line and the trunk base is < 0.03 world units — imperceptible.
 * (At z = -38, the same tilt would create a ~1.4 world-unit gap.)
 *
 * depthTest=false + depthWrite=false + renderOrder=-10 → always paints behind everything
 * without interfering with the depth buffer of foreground objects.
 */
function SceneBackdrop() {
  return (
    <mesh position={[0, FLOOR_LOCAL_Y, -1]} renderOrder={-10}>
      <planeGeometry args={[800, 800]} />
      <shaderMaterial
        vertexShader={BACKDROP_VS}
        fragmentShader={BACKDROP_FS}
        depthTest={false}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function BackgroundForest() {
  return (
    <>
      <SceneBackdrop />
      {BG_TREES.map((t) => (
        <BackgroundTree key={t.id} tree={t} />
      ))}
    </>
  );
}

// ─── Trunk ──────────────────────────────────────────────────

function Trunk() {
  const bark = useMemo(() => makeBarkTextures(), []);
  return (
    <mesh position={[0, -0.4, -0.3]}>
      <cylinderGeometry args={[0.10, 0.21, 0.8, 10]} />
      <meshStandardMaterial
        color="#6b4630"
        map={bark?.color}
        bumpMap={bark?.bump}
        bumpScale={0.12}
        roughnessMap={bark?.roughness}
        roughness={0.66}
        metalness={0.05}
        emissive="#3a2517"
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

const BranchTube = memo(function BranchTube({
  parent,
  child,
}: {
  parent: NodeDef;
  child: NodeDef;
}) {
  const branch = useMemo(() => {
    const pz = parent.z - 0.15;
    const cz = child.z - 0.15;
    const s = new THREE.Vector3(parent.x, parent.y, pz);
    const e = new THREE.Vector3(child.x, child.y, cz);
    const midZ = (pz + cz) / 2;
    const dir = e.clone().sub(s);
    const dirN = dir.clone().normalize();
    const side = new THREE.Vector3().crossVectors(dirN, new THREE.Vector3(0, 0, 1));
    if (side.lengthSq() < 1e-5) side.set(1, 0, 0);
    side.normalize();
    const bend = (hash(child.id * 59 + parent.id) - 0.5) * 0.45;
    const bulge = (hash(child.id * 97 + parent.id * 3) -  0.5) * 0.65;
    const cp1 = s
      .clone()
      .lerp(e, 0.33)
      .addScaledVector(side, bend)
      .add(new THREE.Vector3(0, 0, bulge * 0.7 + (midZ - pz) * 0.2));
    const cp2 = s
      .clone()
      .lerp(e, 0.67)
      .addScaledVector(side, -bend * 0.75)
      .add(new THREE.Vector3(0, 0, bulge));
    const curve = new THREE.CubicBezierCurve3(s, cp1, cp2, e);
    const r = BR_R[Math.min(parent.depth, BR_R.length - 1)];
    // More radial segments on thick near-root branches so lighting curves look smooth
    const radialSegs = parent.depth < 2 ? 10 : parent.depth < 4 ? 7 : 5;
    const geometry = new THREE.TubeGeometry(curve, 22, r, radialSegs, false);
    return { geometry };
  }, [parent, child]);

  const bark = useMemo(() => makeBarkTextures(), []);

  const di = Math.min(parent.depth, BR_C.length - 1);
  const color = useMemo(() => {
    const c = new THREE.Color(BR_C[di]);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    const hueJitter = (hash(child.id * 43 + parent.id * 17) - 0.5) * 0.045;
    const satBoost = 0.05 + hash(child.id * 89) * 0.08;
    const lightJitter = (hash(child.id * 131) - 0.5) * 0.12;
    c.setHSL(
      (hsl.h + hueJitter + 1) % 1,
      THREE.MathUtils.clamp(hsl.s + satBoost, 0, 1),
      THREE.MathUtils.clamp(hsl.l + lightJitter + 0.08, 0.30, 0.72),
    );
    return c;
  }, [di, child.id, parent.id]);
  const roughness = BR_ROUGHNESS[di];
  const metalness = BR_METALNESS[di];

  return (
    <group>
      <mesh geometry={branch.geometry}>
        <meshStandardMaterial
          color={color}
          map={bark?.color}
          bumpMap={bark?.bump}
          bumpScale={0.11}
          roughnessMap={bark?.roughness}
          roughness={roughness}
          metalness={metalness}
          emissive={color.clone().multiplyScalar(0.18)}
          emissiveIntensity={0.12}
        />
      </mesh>
    </group>
  );
});

interface SkillNodeProps {
  node: NodeDef;
  pos: [number, number, number];
  isHovered: boolean;
  onHover: (id: number | null) => void;
  onClick: (node: NodeDef, e: ThreeEvent<MouseEvent>) => void;
}

function nodeShapeIndex(node: NodeDef): number {
  return node.depth
}

const SkillNode = memo(function SkillNode({
  node,
  pos,
  isHovered,
  onHover,
  onClick,
}: SkillNodeProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const glowOuterRef = useRef<THREE.MeshBasicMaterial>(null!);
  const glowInnerRef = useRef<THREE.MeshBasicMaterial>(null!);

  const baseColor = useMemo(() => new THREE.Color(node.color), [node.color]);
  const white = useMemo(() => new THREE.Color('#ffffff'), []);
  const shape = useMemo(() => nodeShapeIndex(node), [node]);
  const pulse = useMemo(() => 0.8 + hash(node.id * 17.3) * 1.2, [node.id]);
  const tilt = useMemo(() => (hash(node.id * 41.7) - 0.5) * 0.45, [node.id]);
  const initRotX = useMemo(() => Math.random() * Math.PI * 2, [node.id]);
  const initRotY = useMemo(() => Math.random() * Math.PI * 2, [node.id]);
  const initRotZ = useMemo(() => Math.random() * Math.PI * 2, [node.id]);

  const renderPolyGeometry = useCallback(
    (radius: number) => {
      if (shape === 0) return <icosahedronGeometry args={[radius * 1.5, 0]} />;
      if (shape === 1) return <dodecahedronGeometry args={[radius * 1.5, 0]} />;
      if(shape === 2) return <octahedronGeometry args={[radius * 1.5, 0]} />;
      if(shape === 3) return <boxGeometry args={[radius * 1.5, radius * 1.5, radius * 1.5]} />;
      return <tetrahedronGeometry args={[radius * 1.5, 0]} />;
    },
    [shape],
  );

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x = initRotX;
    groupRef.current.rotation.y = initRotY;
    groupRef.current.rotation.z += initRotZ;
  }, [initRotX, initRotY, initRotZ]);

  useFrame(() => {
    const grp = groupRef.current;
    const mat = matRef.current;
    const glowOuter = glowOuterRef.current;
    const glowInner = glowInnerRef.current;
    if (!grp || !mat || !glowOuter || !glowInner) return;

    grp.scale.setScalar(THREE.MathUtils.lerp(grp.scale.x, isHovered ? 1.3 : 1, 0.12));
    grp.rotation.z += 0.0018 * pulse;
    grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, tilt, 0.04);
    mat.color.lerp(isHovered ? white : baseColor, 0.12);
    mat.emissive.lerp(isHovered ? baseColor : BLACK, 0.12);
    mat.emissiveIntensity = THREE.MathUtils.lerp(
      mat.emissiveIntensity,
      isHovered ? 1.2 : 0.44,
      0.12,
    );
    glowOuter.opacity = THREE.MathUtils.lerp(glowOuter.opacity, isHovered ? 0.4 : 0.12, 0.1);
    glowInner.opacity = THREE.MathUtils.lerp(glowInner.opacity, isHovered ? 0.55 : 0.2, 0.1);
  });

  return (
    <group ref={groupRef} position={pos}>
      <mesh>
        {renderPolyGeometry(node.size * 2.1)}
        <meshBasicMaterial
          ref={glowOuterRef}
          color={node.color}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        {renderPolyGeometry(node.size * 1.52)}
        <meshBasicMaterial
          ref={glowInnerRef}
          color={node.color}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(node.id);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => onClick(node, e)}
      >
        {renderPolyGeometry(node.size)}
        <meshStandardMaterial
          ref={matRef}
          color={node.color}
          emissive={node.color}
          emissiveIntensity={0.44}
          roughness={0.22}
          metalness={0.35}
        />
      </mesh>
    </group>
  );
});

function Fireflies() {
  const pointsRef = useRef<THREE.Points>(null!);

  const { positions, colors } = useMemo(() => {
    const count = 140;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = i * 0.77 + 13;
      const x = (hash(t * 11.7) - 0.5) * 17;
      const y = 0.9 + hash(t * 7.3) * 11.5;
      const z = -2.8 + hash(t * 19.9) * 7.4;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const warm = hash(t * 5.4);
      const color = new THREE.Color().setHSL(0.12 + warm * 0.08, 0.86, 0.68 + warm * 0.14);
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame(({ clock }) => {
    const pts = pointsRef.current;
    if (!pts) return;
    pts.rotation.y = Math.sin(clock.elapsedTime * 0.04) * 0.06;
    const mat = pts.material as THREE.PointsMaterial;
    mat.opacity = 0.34 + Math.sin(clock.elapsedTime * 1.15) * 0.08;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.19}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.34}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function TreeMeshes({
  hovered,
  onHover,
  onNodeClick,
}: {
  hovered: number | null;
  onHover: (id: number | null) => void;
  onNodeClick: (node: NodeDef, e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <>
      <Trunk />
      {NODES.filter((n) => n.parentId !== null).map((n) => (
        <BranchTube key={n.id} parent={NODES[n.parentId!]} child={n} />
      ))}
      {NODES.map((node, i) => (
        <SkillNode
          key={node.id}
          node={node}
          pos={POS[i]}
          isHovered={hovered === node.id}
          onHover={onHover}
          onClick={onNodeClick}
        />
      ))}
    </>
  );
}

interface OrthoSkillSceneProps {
  viewPixels?: { w: number; h: number };
  viewState?: ViewState;
  setViewState?: Dispatch<SetStateAction<ViewState>>;
  /** When true (default), camera tilt follows mouse to reveal Z depth via parallax. */
  enableTilt?: boolean;
  onNodeHover?: (nodeId: number | null) => void;
  onNodeActivate?: (nodeId: number) => void;
}

/**
 * Orthographic view along -Z: screen (x, y) matches world (x, y) exactly for the chosen frustum.
 * Same mapping as `Layout2DOverlay` when both use the same world frustum + pixel dimensions.
 */
function OrthoSkillScene(props: OrthoSkillSceneProps = {}) {
  const {
    viewPixels,
    viewState: vsProp,
    setViewState: setVsProp,
    enableTilt = true,
    onNodeHover,
    onNodeActivate,
  } = props;
  const { camera, gl, size } = useThree();
  const [internalVs, setInternalVs] = useState<ViewState>(DEFAULT_VIEW);
  const [hovered, setHovered] = useState<number | null>(null);

  const vs = vsProp ?? internalVs;
  const setVs = setVsProp ?? setInternalVs;
  const vw = viewPixels?.w ?? size.width;
  const vh = viewPixels?.h ?? size.height;

  const worldFrustum = useMemo(() => {
    if (vw <= 0 || vh <= 0) return null;
    const base = orthoFrustumForViewport(vw, vh);
    return applyViewState(base, vs);
  }, [vw, vh, vs.panX, vs.panY, vs.zoom]);

  const vsRef = useRef(vs);
  vsRef.current = vs;

  const targetVsRef = useRef<ViewState | null>(null);

  const ctrl = useRef({
    lastX: 0,
    lastY: 0,
    downX: 0,
    downY: 0,
    panCandidate: false,
    panDownX: 0,
    panDownY: 0,
    panDragging: false,
    mouseX: 0,
    mouseY: 0,
    smX: 0,
    smY: 0,
  });

  const handleHover = useCallback(
    (id: number | null) => {
      setHovered(id);
      onNodeHover?.(id);
      if (ctrl.current.panDragging) return;
      gl.domElement.style.cursor = id !== null ? 'pointer' : 'grab';
    },
    [gl, onNodeHover],
  );

  useFrame(() => {
    if (!worldFrustum) return;
    const { left, right, top, bottom, cx, cy } = worldFrustumToCameraLocal(worldFrustum);
    const cam = camera as THREE.OrthographicCamera;
    if (!cam.isOrthographicCamera) return;
    cam.left = left;
    cam.right = right;
    cam.top = top;
    cam.bottom = bottom;
    cam.position.set(cx, cy, ORTHO_CAM_Z);

    // Smooth mouse tilt — tilts the lookAt target, revealing Z depth via parallax.
    // At rest (mouse centered) the camera looks straight along -Z, so XY projection is exact.
    const c = ctrl.current;
    c.smX += (c.mouseX - c.smX) * LERP_MOUSE;
    c.smY += (c.mouseY - c.smY) * LERP_MOUSE;
    // Reduce parallax when zoomed in: zoom < 1 means zoomed in, so scale tilt down proportionally.
    const parallaxScale = THREE.MathUtils.clamp(vsRef.current.zoom, 0, 1);
    const tiltX = enableTilt ? c.smX * TILT_X * parallaxScale : 0;
    const tiltY = enableTilt ? c.smY * TILT_Y * parallaxScale : 0;
    cam.lookAt(cx + tiltX, cy + tiltY, 0);

    // Animate towards click-to-zoom target
    const tgt = targetVsRef.current;
    if (tgt) {
      const cur = vsRef.current;
      const newZoom = THREE.MathUtils.lerp(cur.zoom, tgt.zoom, LERP_ZOOM);
      const newPanX = THREE.MathUtils.lerp(cur.panX, tgt.panX, LERP_ZOOM);
      const newPanY = THREE.MathUtils.lerp(cur.panY, tgt.panY, LERP_ZOOM);
      if (
        Math.abs(newZoom - tgt.zoom) < 0.0005 &&
        Math.abs(newPanX - tgt.panX) < 0.0005 &&
        Math.abs(newPanY - tgt.panY) < 0.0005
      ) {
        setVs(tgt);
        targetVsRef.current = null;
      } else {
        setVs({ zoom: newZoom, panX: newPanX, panY: newPanY });
      }
    }

    cam.updateProjectionMatrix();
  });

  useEffect(() => {
    const el = gl.domElement;
    el.style.cursor = 'grab';

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetVsRef.current = null;
      if (vw <= 0 || vh <= 0) return;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;  // mouse pixels from canvas left
      const my = e.clientY - rect.top;   // mouse pixels from canvas top

      setVs((prev) => {
        const base = orthoFrustumForViewport(vw, vh);
        const cur = applyViewState(base, prev);
        const baseCx = (base.left + base.right) / 2;
        const baseCy = (base.bottom + base.top) / 2;

        // World position under mouse with current frustum
        const mwx = cur.left + (mx / vw) * (cur.right - cur.left);
        const mwy = cur.bottom + (1 - my / vh) * (cur.top - cur.bottom);

        const newZoom = THREE.MathUtils.clamp(
          prev.zoom * (1 - e.deltaY * ZOOM_FACTOR),
          MIN_ZOOM,
          MAX_ZOOM,
        );
        const ratio = newZoom / prev.zoom;

        // Shift pan so the world point under the mouse stays fixed
        const newCx = mwx + (baseCx + prev.panX - mwx) * ratio;
        const newCy = mwy + (baseCy + prev.panY - mwy) * ratio;

        return { panX: newCx - baseCx, panY: newCy - baseCy, zoom: newZoom };
      });
    };

    const onDown = (e: PointerEvent) => {
      const c = ctrl.current;
      c.panCandidate = true;
      c.panDragging = false;
      c.lastX = e.clientX;
      c.lastY = e.clientY;
      c.downX = e.clientX;
      c.downY = e.clientY;
      c.panDownX = e.clientX;
      c.panDownY = e.clientY;
    };

    const onMove = (e: PointerEvent) => {
      const c = ctrl.current;
      if (vw <= 0 || vh <= 0) return;

      // Always track mouse for tilt, regardless of panning state
      const rect = el.getBoundingClientRect();
      c.mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      c.mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;

      if (c.panCandidate && !c.panDragging) {
        const d = Math.hypot(e.clientX - c.panDownX, e.clientY - c.panDownY);
        if (d > DRAG_THRESHOLD) {
          c.panDragging = true;
          el.style.cursor = 'grabbing';
          c.lastX = e.clientX;
          c.lastY = e.clientY;
        }
      }

      if (c.panDragging) {
        const dx = e.clientX - c.lastX;
        const dy = e.clientY - c.lastY;
        c.lastX = e.clientX;
        c.lastY = e.clientY;
        targetVsRef.current = null;
        // Scale pan delta by current zoom so a drag feels consistent at any zoom level
        setVs((prev) => {
          const base = orthoFrustumForViewport(vw, vh);
          const ww2 = (base.right - base.left) * prev.zoom;
          const wh2 = (base.top - base.bottom) * prev.zoom;
          return {
            ...prev,
            panX: prev.panX + (-dx / vw) * ww2,
            panY: prev.panY + (dy / vh) * wh2,
          };
        });
      }
    };

    const onUp = () => {
      const c = ctrl.current;
      c.panCandidate = false;
      c.panDragging = false;
      el.style.cursor = 'grab';
    };

    const resetView = () => setVs(DEFAULT_VIEW);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') resetView();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('dblclick', resetView);
    window.addEventListener('keydown', onKey);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('dblclick', resetView);
      window.removeEventListener('keydown', onKey);
    };
  }, [gl, vw, vh, setVs]);

  const onNodeClick = useCallback(
    (node: NodeDef, e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const c = ctrl.current;
      const ne = e.nativeEvent;
      if (Math.hypot(ne.clientX - c.downX, ne.clientY - c.downY) > DRAG_THRESHOLD) return;
      onNodeActivate?.(node.id);
      if (onNodeActivate) return;
      if (vw <= 0 || vh <= 0) return;
      const b = orthoFrustumForViewport(vw, vh);
      const baseCx = (b.left + b.right) / 2;
      const baseCy = (b.bottom + b.top) / 2;
      const targetZoom = Math.min(vsRef.current.zoom, NODE_CLICK_ZOOM);
      targetVsRef.current = { panX: node.x - baseCx, panY: node.y - baseCy, zoom: targetZoom };
    },
    [vw, vh, onNodeActivate],
  );

  return (
    <>
      <color attach="background" args={[BACKGROUND_COLOR]} />
      <OrthographicCamera makeDefault near={0.1} far={120} left={-1} right={1} top={1} bottom={-1} />

      <fog attach="fog" args={[FOG_COLOR, 24, 78]} />

      {/* Lift base exposure so bark colors stay visible and do not collapse to near-black */}
      <ambientLight intensity={0.42} />
      <hemisphereLight args={['#deecf2', '#9a8067', 0.56]} />
      {/* Strong key from upper-left-front — primary bark highlights */}
      <directionalLight position={[-6, 14, 12]} intensity={1.35} color="#fff6ea" />
      {/* Cool rim from upper-right-back — separates branches from sky */}
      <directionalLight position={[8, 10, -4]} intensity={0.82} color="#c7dded" />
      {/* Soft front fill aimed from camera side to prevent silhouette-black branch segments */}
      <directionalLight position={[0, 4, 18]} intensity={0.75} color="#ffe7d2" />
      {/* Warm bounce from below (ground reflection) */}
      <pointLight position={[0, -0.5, 5]} intensity={1.05} color="#d8b27a" distance={24} decay={2} />
      {/* Soft sky fill from above */}
      <pointLight position={[0, 16, 6]} intensity={0.62} color="#c5dbe6" distance={32} decay={2} />
      {/* Side fill to keep far-left and far-right limbs from clipping into deep shadow */}
      <pointLight position={[-14, 7, 4]} intensity={0.42} color="#e7c6a6" distance={38} decay={2} />
      <pointLight position={[14, 7, 4]} intensity={0.42} color="#e7c6a6" distance={38} decay={2} />

      <BackgroundForest />
      <TreeMeshes hovered={hovered} onHover={handleHover} onNodeClick={onNodeClick} />
      <Fireflies />

      <EffectComposer>
        <Bloom
          intensity={BLOOM_INTENSITY}
          radius={BLOOM_RADIUS}
          mipmapBlur
          luminanceThreshold={BLOOM_THRESHOLD}
          luminanceSmoothing={0.65}
        />
        <Noise opacity={0.02} />
        <Vignette eskil={false} offset={0.12} darkness={0.38} />
      </EffectComposer>
    </>
  );
}

/**
 * 2D diagram: same XY as orthographic projection of the 3D scene (straight edges in XY).
 */
function Layout2DOverlay({
  frustum,
  width,
  height,
}: {
  frustum: { left: number; right: number; top: number; bottom: number };
  width: number;
  height: number;
}) {
  const { left, right, top, bottom } = frustum;
  const w = right - left;
  const h = top - bottom;

  const toSvg = useCallback(
    (x: number, y: number) => {
      const px = ((x - left) / w) * width;
      const py = ((top - y) / h) * height;
      return { px, py };
    },
    [left, right, top, bottom, width, height, w, h],
  );

  const lines = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    for (const n of NODES) {
      if (n.parentId === null) continue;
      const p = NODES[n.parentId];
      const a = toSvg(p.x, p.y);
      const b = toSvg(n.x, n.y);
      out.push({ x1: a.px, y1: a.py, x2: b.px, y2: b.py, key: `e-${n.id}` });
    }
    return out;
  }, [toSvg]);

  const circles = useMemo(() => {
    return NODES.map((n) => {
      const { px, py } = toSvg(n.x, n.y);
      const r = (n.size / w) * width;
      return { ...n, px, py, r: Math.max(r, 2) };
    });
  }, [toSvg, w, width]);

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', background: BACKGROUND_COLOR }}
      aria-label="2D skill tree layout"
    >
      {lines.map((ln) => (
        <line
          key={ln.key}
          x1={ln.x1}
          y1={ln.y1}
          x2={ln.x2}
          y2={ln.y2}
          stroke="#5d4037"
          strokeWidth={2}
          strokeLinecap="round"
        />
      ))}
      {circles.map((n) => (
        <circle key={n.id} cx={n.px} cy={n.py} r={n.r} fill={n.color} stroke="#1e1e24" strokeWidth={1} />
      ))}
    </svg>
  );
}


function CompareSplitView({ onClose }: { onClose: () => void }) {
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(0.5);
  const splitDragging = useRef(false);
  const [pane, setPane] = useState({ cw: 0, ch: 0 });
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW);

  useEffect(() => {
    const el = splitPaneRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setPane({ cw: r.width, ch: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!splitDragging.current || !splitPaneRef.current) return;
      const r = splitPaneRef.current.getBoundingClientRect();
      const t = (e.clientX - r.left) / r.width;
      setSplit(THREE.MathUtils.clamp(t, 0.06, 0.94));
    };
    const onUp = () => {
      splitDragging.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const sharedFrustum = useMemo(() => {
    if (pane.cw <= 0 || pane.ch <= 0) return { left: -1, right: 1, top: 1, bottom: -1 };
    const base = orthoFrustumForViewport(pane.cw, pane.ch);
    return applyViewState(base, viewState);
  }, [pane.cw, pane.ch, viewState]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: BACKGROUND_COLOR,
      }}
    >
      <div
        style={{
          padding: '12px 12px 0',
          flexShrink: 0,
          zIndex: 5,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Exit compare
        </button>
        <span style={{ color: '#64748b', fontSize: 12, fontFamily: 'system-ui, sans-serif' }}>
          Orthographic XY: 2D and 3D use the same world frustum — projections match exactly. Drag handle to compare.
        </span>
      </div>

      <div ref={splitPaneRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {pane.cw > 0 && pane.ch > 0 && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
              }}
            >
        <Canvas style={{ width: '100%', height: '100%', display: 'block' }} gl={{ antialias: true }}>
                <OrthoSkillScene viewPixels={{ w: pane.cw, h: pane.ch }} viewState={viewState} setViewState={setViewState} enableTilt={false} />
              </Canvas>
            </div>

            {/* Top: full 2D SVG clipped from the left — reveals 3D underneath on the right */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                pointerEvents: 'none',
                clipPath: `polygon(0 0, ${split * 100}% 0, ${split * 100}% 100%, 0 100%)`,
              }}
            >
              <Layout2DOverlay frustum={sharedFrustum} width={pane.cw} height={pane.ch} />
            </div>

            <div
              style={{
                position: 'absolute',
                left: 16,
                bottom: 14,
                zIndex: 3,
                pointerEvents: 'none',
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(15,23,42,0.75)',
                color: '#cbd5e1',
                fontSize: 12,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              2D (same frustum)
            </div>
            <div
              style={{
                position: 'absolute',
                right: 16,
                bottom: 14,
                zIndex: 3,
                pointerEvents: 'none',
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(241,245,249,0.92)',
                color: '#0f172a',
                fontSize: 12,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              3D orthographic
            </div>
          </>
        )}

        <div
          role="slider"
          aria-valuenow={Math.round(split * 100)}
          aria-label="Compare split"
          tabIndex={0}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            splitDragging.current = true;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `calc(${split * 100}% - 10px)`,
            width: 20,
            cursor: 'col-resize',
            zIndex: 10,
            touchAction: 'none',
            background:
              'linear-gradient(90deg, transparent 0%, transparent 38%, #39ff14 38%, #39ff14 62%, transparent 62%, transparent 100%)',
            boxShadow: '0 0 14px rgba(57,255,80,0.45)',
          }}
        />
      </div>
    </div>
  );
}

export default function SkillTreeV3() {
  const router = useRouter();
  const [compare, setCompare] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<number>(0);

  const activeTarget = NODE_TARGETS[activeNodeId] ?? NODE_TARGETS[0];
  const activeNode = NODES[activeNodeId] ?? NODES[0];

  const handleNodeHover = useCallback((nodeId: number | null) => {
    if (nodeId === null) return;
    setActiveNodeId(nodeId);
  }, []);

  const handleNodeActivate = useCallback(
    (nodeId: number) => {
      const target = NODE_TARGETS[nodeId];
      if (!target) return;
      setActiveNodeId(nodeId);
      router.push(target.href);
    },
    [router],
  );

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: BACKGROUND_COLOR }}>
      {!compare && (
        <button
          type="button"
          onClick={() => setCompare(true)}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 20,
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Compare 2D / 3D
        </button>
      )}

      {compare ? (
        <CompareSplitView onClose={() => setCompare(false)} />
      ) : (
        <Canvas gl={{ antialias: true }} style={{ width: '100%', height: '100%', background: BACKGROUND_COLOR }}>
          <OrthoSkillScene onNodeHover={handleNodeHover} onNodeActivate={handleNodeActivate} />
        </Canvas>
      )}

      {!compare && (
        <aside
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            zIndex: 24,
            width: 'min(360px, calc(100vw - 24px))',
            background: 'rgba(15, 23, 42, 0.84)',
            border: '1px solid rgba(148, 163, 184, 0.52)',
            borderRadius: 10,
            boxShadow: '0 12px 28px rgba(2, 6, 23, 0.35)',
            color: '#e2e8f0',
            backdropFilter: 'blur(7px)',
            padding: '12px 12px 11px',
          }}
        >
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#93c5fd' }}>
            Node destination
          </p>
          <h3 style={{ margin: '4px 0 0', fontSize: 17, lineHeight: 1.2, color: '#f8fafc' }}>
            {activeTarget.skill}
          </h3>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#cbd5e1' }}>{activeTarget.detail}</p>
        </aside>
      )}
    </div>
  );
}
