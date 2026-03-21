'use client';

import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { useRef, useState, useCallback, useEffect, useMemo, memo, type Dispatch, type SetStateAction } from 'react';
import * as THREE from 'three';

const ORTHO_CAM_Z = 22;
const SCROLL_SPEED = 0.012;
const DRAG_THRESHOLD = 5;
const BLACK = new THREE.Color(0x000000);
/** How far the lookAt target shifts when mouse is at canvas edge — creates Z parallax. */
const TILT_X = 3.2;
const TILT_Y = 1.6;
const LERP_MOUSE = 0.05;
const Z_SCALE = 1.8;  // more Z depth so parallax is visible

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

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const FAMILY_SHADES = [
  ['#4fc3f7', '#29b6f6', '#81d4fa', '#b3e5fc', '#e1f5fe', '#e1f5fe'],
  ['#81c784', '#66bb6a', '#a5d6a7', '#c8e6c9', '#e8f5e9', '#e8f5e9'],
  ['#ff8a65', '#ff7043', '#ffab91', '#ffccbc', '#fbe9e7', '#fbe9e7'],
];
const SIZES = [0.28, 0.23, 0.21, 0.2, 0.19, 0.18, 0.18];
const Y_STEP = 1.5;
const TREE_W = 12;
const MAX_DEPTH = 6;
const MAX_NODES = 60;
// Z_SCALE defined above with other camera constants
const Z_MAX_ACC = 5;
/** Minimum edge-to-edge gap between sibling nodes in world units. */
const NODE_GAP = 0.14;

interface Frontier {
  id: number;
  xMin: number;
  xMax: number;
  family: number;
}

function randomWeights(k: number, seed: number): number[] {
  const w: number[] = [];
  let s = 0;
  for (let i = 0; i < k; i++) {
    const t = 0.25 + hash(seed * 41 + i * 97) * 0.75;
    w.push(t);
    s += t;
  }
  return w.map((t) => t / s);
}

function splitRange(xMin: number, xMax: number, k: number, seed: number): [number, number][] {
  const w = randomWeights(k, seed);
  const out: [number, number][] = [];
  let acc = xMin;
  const span = xMax - xMin;
  for (let i = 0; i < k; i++) {
    const hi = acc + span * w[i];
    out.push([acc, hi]);
    acc = hi;
  }
  return out;
}

/**
 * Maximum children that fit in `slotWidth` without overlapping at the next depth level.
 * Slot must accommodate `nc` nodes each of diameter `2*sz` plus `NODE_GAP` between edges.
 */
function maxChildrenInSlot(slotWidth: number, childDepth: number): number {
  const sz = SIZES[Math.min(childDepth, SIZES.length - 1)];
  return Math.max(0, Math.floor(slotWidth / (2 * sz + NODE_GAP)));
}

function childCountFor(depth: number, id: number, nodesSoFar: number, slotWidth: number): number {
  if (depth >= MAX_DEPTH - 1) return 0;
  if (nodesSoFar >= MAX_NODES - 1) return 0;
  const maxFit = maxChildrenInSlot(slotWidth, depth + 1);
  if (maxFit < 1) return 0;

  const h = hash(id * 503 + depth * 131);
  let c: number;
  if (depth === 0) {
    c = 2 + Math.floor(h * 3);
  } else if (depth === 1) {
    c = 1 + Math.floor(hash(id * 17 + 9) * 3);
  } else {
    c = 1 + Math.floor(h * 2.5);
  }
  const room = MAX_NODES - nodesSoFar - 1;
  return Math.min(c, Math.min(maxFit, Math.max(0, room)));
}

function generateTree2D(): Omit<NodeDef, 'z'>[] {
  const nodes: Omit<NodeDef, 'z'>[] = [];
  let nid = 0;

  nodes.push({
    id: nid++,
    parentId: null,
    depth: 0,
    family: -1,
    x: 0,
    y: 0,
    color: '#ffd54f',
    size: SIZES[0],
  });

  let frontier: Frontier[] = [
    { id: 0, xMin: -TREE_W / 2, xMax: TREE_W / 2, family: -1 },
  ];

  let childOrd = 0;

  while (frontier.length && nid < MAX_NODES) {
    const next: Frontier[] = [];

    for (let fi = 0; fi < frontier.length; fi++) {
      const p = frontier[fi];
      const parent = nodes[p.id];
      const depth = parent.depth;
      const slotWidth = p.xMax - p.xMin;
      const nc = childCountFor(depth, p.id, nid, slotWidth);
      if (nc <= 0) continue;

      const ranges = splitRange(p.xMin, p.xMax, nc, p.id * 701 + depth * 13);

      for (let c = 0; c < nc; c++) {
        if (nid >= MAX_NODES) break;
        const [xMin, xMax] = ranges[c];
        const sz = SIZES[Math.min(depth + 1, SIZES.length - 1)];
        // Jitter only within slack: space left after the node diameter and gap
        const slack = Math.max(0, (xMax - xMin) - 2 * sz - NODE_GAP);
        const jx = (hash(nid * 271 + 13) - 0.5) * slack * 0.5;
        const jy = (hash(nid * 137 + 42) - 0.5) * 0.16;
        const x = (xMin + xMax) / 2 + jx;
        const y = (depth + 1) * Y_STEP + jy;
        const family = depth === 0 ? childOrd : p.family;
        const color = FAMILY_SHADES[family % 3][Math.min(depth, 5)];

        const id = nid++;
        nodes.push({
          id,
          parentId: p.id,
          depth: depth + 1,
          family,
          x,
          y,
          color,
          size: sz,
        });
        next.push({ id, xMin, xMax, family });
        childOrd++;
      }
    }

    frontier = next;
    if (!frontier.length) break;
  }

  return nodes;
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

function buildNodes(): NodeDef[] {
  const base = generateTree2D();
  const zs = liftZ(base);
  return base.map((n, i) => ({ ...n, z: zs[i] }));
}

const NODES = buildNodes();
const POS: [number, number, number][] = NODES.map((n) => [n.x, n.y, n.z]);
const BR_R = [0.055, 0.04, 0.032, 0.025, 0.02, 0.016, 0.014];
const BR_C = ['#3e2723', '#4e342e', '#5d4037', '#6d4c41', '#795548', '#8d6e63', '#8d6e63'];

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

/**
 * World-space XY frustum for the front (view) plane — same numbers drive SVG and OrthographicCamera.
 * Projection of any point (x, y, z) onto the view plane is (x, y); z only affects depth/lighting.
 */
function orthoFrustumForViewport(
  vw: number,
  vh: number,
  pad = TREE_PAD,
): { left: number; right: number; top: number; bottom: number } {
  if (vw <= 0 || vh <= 0) {
    return { left: -1, right: 1, top: 1, bottom: -1 };
  }
  const { minX, maxX, minY, maxY } = treeAxisBounds();
  const bw = maxX - minX + pad * 2;
  const bh = maxY - minY + pad * 2;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
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
  return {
    left: cx - halfW,
    right: cx + halfW,
    bottom: cy - halfH,
    top: cy + halfH,
  };
}

function applyPanToWorldFrustum(
  base: { left: number; right: number; top: number; bottom: number },
  pan: { x: number; y: number },
): { left: number; right: number; top: number; bottom: number } {
  const halfW = (base.right - base.left) / 2;
  const halfH = (base.top - base.bottom) / 2;
  const tcx = (base.left + base.right) / 2;
  const tcy = (base.bottom + base.top) / 2;
  return {
    left: tcx + pan.x - halfW,
    right: tcx + pan.x + halfW,
    bottom: tcy + pan.y - halfH,
    top: tcy + pan.y + halfH,
  };
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

// ─── Trunk ──────────────────────────────────────────────────

function Trunk() {
  return (
    <mesh position={[0, -0.4, -0.3]}>
      <cylinderGeometry args={[0.07, 0.14, 0.8, 6]} />
      <meshStandardMaterial color="#3e2723" roughness={0.8} />
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
  const geometry = useMemo(() => {
    const pz = parent.z - 0.15;
    const cz = child.z - 0.15;
    const s = new THREE.Vector3(parent.x, parent.y, pz);
    const e = new THREE.Vector3(child.x, child.y, cz);
    const midX = (parent.x + child.x) / 2;
    const midY = (parent.y + child.y) / 2;
    const midZ = (pz + cz) / 2;
    const bulge = (hash(child.id * 59 + parent.id) - 0.5) * 0.55;
    const cp = new THREE.Vector3(midX, midY, midZ + bulge);
    const curve = new THREE.QuadraticBezierCurve3(s, cp, e);
    const r = BR_R[Math.min(parent.depth, BR_R.length - 1)];
    return new THREE.TubeGeometry(curve, 14, r, 5, false);
  }, [parent, child]);

  const color = BR_C[Math.min(parent.depth, BR_C.length - 1)];

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
});

interface SkillNodeProps {
  node: NodeDef;
  pos: [number, number, number];
  isHovered: boolean;
  onHover: (id: number | null) => void;
  onClick: (node: NodeDef, e: ThreeEvent<MouseEvent>) => void;
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
  const glowRef = useRef<THREE.MeshBasicMaterial>(null!);

  const baseColor = useMemo(() => new THREE.Color(node.color), [node.color]);
  const white = useMemo(() => new THREE.Color('#ffffff'), []);

  useFrame(() => {
    const grp = groupRef.current;
    const mat = matRef.current;
    const glow = glowRef.current;
    if (!grp || !mat || !glow) return;

    grp.scale.setScalar(THREE.MathUtils.lerp(grp.scale.x, isHovered ? 1.3 : 1, 0.12));
    mat.color.lerp(isHovered ? white : baseColor, 0.12);
    mat.emissive.lerp(isHovered ? baseColor : BLACK, 0.12);
    mat.emissiveIntensity = THREE.MathUtils.lerp(
      mat.emissiveIntensity,
      isHovered ? 0.7 : 0.2,
      0.12,
    );
    glow.opacity = THREE.MathUtils.lerp(glow.opacity, isHovered ? 0.3 : 0.08, 0.1);
  });

  return (
    <group ref={groupRef} position={pos}>
      <mesh>
        <sphereGeometry args={[node.size * 1.4, 12, 12]} />
        <meshBasicMaterial
          ref={glowRef}
          color={node.color}
          transparent
          opacity={0.08}
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
        <sphereGeometry args={[node.size, 16, 16]} />
        <meshStandardMaterial
          ref={matRef}
          color={node.color}
          emissive={node.color}
          emissiveIntensity={0.2}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
});

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
  pan?: { x: number; y: number };
  setPan?: Dispatch<SetStateAction<{ x: number; y: number }>>;
  /**
   * When true (default), camera tilt follows mouse to reveal Z depth via parallax.
   * Disable in compare mode so the straight-on projection matches the 2D overlay exactly.
   */
  enableTilt?: boolean;
}

/**
 * Orthographic view along -Z: screen (x, y) matches world (x, y) exactly for the chosen frustum.
 * Same mapping as `Layout2DOverlay` when both use the same world frustum + pixel dimensions.
 */
function OrthoSkillScene(props: OrthoSkillSceneProps = {}) {
  const { viewPixels, pan: panProp, setPan: setPanProp, enableTilt = true } = props;
  const { camera, gl, size } = useThree();
  const [internalPan, setInternalPan] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<number | null>(null);

  const pan = panProp ?? internalPan;
  const setPan = setPanProp ?? setInternalPan;
  const vw = viewPixels?.w ?? size.width;
  const vh = viewPixels?.h ?? size.height;

  const worldFrustum = useMemo(() => {
    if (vw <= 0 || vh <= 0) return null;
    const base = orthoFrustumForViewport(vw, vh);
    return applyPanToWorldFrustum(base, pan);
  }, [vw, vh, pan.x, pan.y]);

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
      if (ctrl.current.panDragging) return;
      gl.domElement.style.cursor = id !== null ? 'pointer' : 'grab';
    },
    [gl],
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
    const tiltX = enableTilt ? c.smX * TILT_X : 0;
    const tiltY = enableTilt ? c.smY * TILT_Y : 0;
    cam.lookAt(cx + tiltX, cy + tiltY, 0);

    cam.updateProjectionMatrix();
  });

  useEffect(() => {
    const el = gl.domElement;
    el.style.cursor = 'grab';

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (vw <= 0 || vh <= 0) return;
      const base = orthoFrustumForViewport(vw, vh);
      const wh = base.top - base.bottom;
      setPan((p) => ({ x: p.x, y: p.y + e.deltaY * SCROLL_SPEED * wh }));
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

      const base = orthoFrustumForViewport(vw, vh);
      const ww = base.right - base.left;
      const wh = base.top - base.bottom;

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
        const dxW = (-dx / vw) * ww;
        const dyW = (dy / vh) * wh;
        setPan((p) => ({ x: p.x + dxW, y: p.y + dyW }));
      }
    };

    const onUp = () => {
      const c = ctrl.current;
      c.panCandidate = false;
      c.panDragging = false;
      el.style.cursor = 'grab';
    };

    const resetView = () => {
      setPan({ x: 0, y: 0 });
    };

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
  }, [gl, vw, vh, setPan]);

  const onNodeClick = useCallback(
    (node: NodeDef, e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const c = ctrl.current;
      const ne = e.nativeEvent;
      if (Math.hypot(ne.clientX - c.downX, ne.clientY - c.downY) > DRAG_THRESHOLD) return;
      if (vw <= 0 || vh <= 0) return;
      const { tcx, tcy } = (() => {
        const b = orthoFrustumForViewport(vw, vh);
        return { tcx: (b.left + b.right) / 2, tcy: (b.bottom + b.top) / 2 };
      })();
      setPan({ x: node.x - tcx, y: node.y - tcy });
    },
    [vw, vh, setPan],
  );

  return (
    <>
      <OrthographicCamera makeDefault near={0.1} far={120} left={-1} right={1} top={1} bottom={-1} />

      <fog attach="fog" args={['#0a0a0f', 12, 36]} />

      <ambientLight intensity={0.38} />
      <directionalLight position={[2, 12, 10]} intensity={0.72} />
      <directionalLight position={[-4, 6, 8]} intensity={0.22} color="#90caf9" />
      <pointLight position={[0, -1, 6]} intensity={0.48} color="#ffd54f" distance={24} decay={2} />
      <pointLight position={[0, 10, 6]} intensity={0.32} color="#90caf9" distance={24} decay={2} />

      <TreeMeshes hovered={hovered} onHover={handleHover} onNodeClick={onNodeClick} />
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
      style={{ display: 'block', background: '#0a0a0f' }}
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
  const [pan, setPan] = useState({ x: 0, y: 0 });

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
    if (pane.cw <= 0 || pane.ch <= 0) {
      return { left: -1, right: 1, top: 1, bottom: -1 };
    }
    const base = orthoFrustumForViewport(pane.cw, pane.ch);
    return applyPanToWorldFrustum(base, pan);
  }, [pane.cw, pane.ch, pan.x, pan.y]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0a0f',
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
                <OrthoSkillScene viewPixels={{ w: pane.cw, h: pane.ch }} pan={pan} setPan={setPan} enableTilt={false} />
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
  const [compare, setCompare] = useState(false);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#0a0a0f' }}>
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
        <Canvas gl={{ antialias: true }} style={{ width: '100%', height: '100%', background: '#0a0a0f' }}>
          <OrthoSkillScene />
        </Canvas>
      )}
    </div>
  );
}
