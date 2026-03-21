'use client';

import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { useRef, useState, useCallback, useEffect, useMemo, memo } from 'react';
import * as THREE from 'three';

const CAMERA_DIST = 14;
const FOCUS_DIST = 8;
const Y_MIN = -1;
const Y_MAX = 11;
const SCROLL_SPEED = 0.012;
const LERP = 0.06;
const DRAG_THRESHOLD = 5;
const PARALLAX_X = 1.4;
const PARALLAX_Y = 0.7;
const BLACK = new THREE.Color(0x000000);

// ─── Tree generation ────────────────────────────────────────

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
const SIZES = [0.28, 0.23, 0.21, 0.20, 0.19, 0.18, 0.18];
const Y_STEP = 1.5;
const TREE_W = 12;

const BRANCHING = [
  [3],
  [2, 3, 2],
  [2, 1, 2, 1, 2, 1, 2],
  [1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1],
];

function generateTree(): NodeDef[] {
  const nodes: NodeDef[] = [];
  let nid = 0;

  nodes.push({
    id: nid++, parentId: null, depth: 0, family: -1,
    x: 0, y: 0, z: 0, color: '#ffd54f', size: SIZES[0],
  });

  let cur: { id: number; xMin: number; xMax: number; family: number }[] = [
    { id: 0, xMin: -TREE_W / 2, xMax: TREE_W / 2, family: -1 },
  ];

  for (let lvl = 0; lvl < BRANCHING.length; lvl++) {
    const counts = BRANCHING[lvl];
    const nxt: typeof cur = [];
    const depth = lvl + 1;
    const baseY = depth * Y_STEP;
    const sz = SIZES[Math.min(depth, SIZES.length - 1)];
    let childOrd = 0;

    for (let i = 0; i < cur.length; i++) {
      const p = cur[i];
      const nc = counts[i] ?? 0;
      if (nc === 0) continue;

      const cw = (p.xMax - p.xMin) / nc;

      for (let c = 0; c < nc; c++) {
        const xMin = p.xMin + c * cw;
        const xMax = xMin + cw;
        const family = depth === 1 ? childOrd : p.family;
        const jx = (hash(nid * 271 + 13) - 0.5) * 0.12;
        const jy = (hash(nid * 137 + 42) - 0.5) * 0.18;
        const x = (xMin + xMax) / 2 + jx;
        const y = baseY + jy;
        const color = FAMILY_SHADES[family % 3][Math.min(depth - 1, 5)];

        // Z depth: random spread that grows with depth + edges curve back
        const zRand = (hash(nid * 397 + 77) - 0.5) * 2;
        const zSpread = 0.4 + depth * 0.3;
        const zCurve = -Math.abs(x) * 0.1;
        const z = zRand * zSpread + zCurve;

        nodes.push({ id: nid++, parentId: p.id, depth, family, x, y, z, color, size: sz });
        nxt.push({ id: nid - 1, xMin, xMax, family });
        childOrd++;
      }
    }

    cur = nxt;
  }

  return nodes;
}

// ─── Precomputed data ───────────────────────────────────────

const NODES = generateTree();
const POS: [number, number, number][] = NODES.map(n => [n.x, n.y, n.z]);
const BR_R = [0.055, 0.04, 0.032, 0.025, 0.02, 0.016, 0.014];
const BR_C = ['#3e2723', '#4e342e', '#5d4037', '#6d4c41', '#795548', '#8d6e63', '#8d6e63'];

// ─── Trunk ──────────────────────────────────────────────────

function Trunk() {
  return (
    <mesh position={[0, -0.4, -0.3]}>
      <cylinderGeometry args={[0.07, 0.14, 0.8, 6]} />
      <meshStandardMaterial color="#3e2723" roughness={0.8} />
    </mesh>
  );
}

// ─── Branch tube ────────────────────────────────────────────

const BranchTube = memo(function BranchTube(
  { parent, child }: { parent: NodeDef; child: NodeDef },
) {
  const geometry = useMemo(() => {
    const pz = parent.z - 0.15;
    const cz = child.z - 0.15;
    const s = new THREE.Vector3(parent.x, parent.y, pz);
    const e = new THREE.Vector3(child.x, child.y, cz);
    const cp = new THREE.Vector3(
      parent.x + (child.x - parent.x) * 0.3,
      parent.y + (child.y - parent.y) * 0.55,
      (pz + cz) / 2,
    );
    const curve = new THREE.QuadraticBezierCurve3(s, cp, e);
    const r = BR_R[Math.min(parent.depth, BR_R.length - 1)];
    return new THREE.TubeGeometry(curve, 12, r, 5, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const color = BR_C[Math.min(parent.depth, BR_C.length - 1)];

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
});

// ─── Interactive node ───────────────────────────────────────

interface SkillNodeProps {
  node: NodeDef;
  pos: [number, number, number];
  isHovered: boolean;
  onHover: (id: number | null) => void;
  onClick: (node: NodeDef, e: ThreeEvent<MouseEvent>) => void;
}

const SkillNode = memo(function SkillNode({
  node, pos, isHovered, onHover, onClick,
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
      mat.emissiveIntensity, isHovered ? 0.7 : 0.2, 0.12,
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
        onPointerOver={(e) => { e.stopPropagation(); onHover(node.id); }}
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

// ─── Scene ──────────────────────────────────────────────────

function Scene() {
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState<number | null>(null);

  const ctrl = useRef({
    tY: 4.5, cY: 4.5,
    tX: 0, cX: 0,
    tDist: CAMERA_DIST, cDist: CAMERA_DIST,
    drag: false,
    lastX: 0, lastY: 0, downX: 0, downY: 0,
    mouseX: 0, mouseY: 0, smX: 0, smY: 0,
  });

  const handleHover = useCallback((id: number | null) => {
    setHovered(id);
    if (ctrl.current.drag) return;
    gl.domElement.style.cursor = id !== null ? 'pointer' : 'grab';
  }, [gl]);

  useEffect(() => {
    const el = gl.domElement;
    el.style.cursor = 'grab';

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      ctrl.current.tY = THREE.MathUtils.clamp(
        ctrl.current.tY + e.deltaY * SCROLL_SPEED, Y_MIN, Y_MAX,
      );
    };

    const onDown = (e: PointerEvent) => {
      const c = ctrl.current;
      c.drag = true;
      c.lastX = e.clientX; c.lastY = e.clientY;
      c.downX = e.clientX; c.downY = e.clientY;
      el.style.cursor = 'grabbing';
    };

    const onMove = (e: PointerEvent) => {
      const c = ctrl.current;
      c.mouseX = (e.clientX / el.clientWidth - 0.5) * 2;
      c.mouseY = -(e.clientY / el.clientHeight - 0.5) * 2;

      if (c.drag) {
        const dx = e.clientX - c.lastX;
        const dy = e.clientY - c.lastY;
        const s = c.cDist * 0.0012;
        c.tX = THREE.MathUtils.clamp(c.tX - dx * s, -8, 8);
        c.tY = THREE.MathUtils.clamp(c.tY + dy * s, Y_MIN, Y_MAX);
        c.lastX = e.clientX;
        c.lastY = e.clientY;
      }
    };

    const onUp = () => { ctrl.current.drag = false; el.style.cursor = 'grab'; };

    const resetView = () => {
      const c = ctrl.current;
      c.tY = 4.5; c.tX = 0; c.tDist = CAMERA_DIST;
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
  }, [gl]);

  useFrame(() => {
    const c = ctrl.current;
    c.cY += (c.tY - c.cY) * LERP;
    c.cX += (c.tX - c.cX) * LERP;
    c.cDist += (c.tDist - c.cDist) * LERP;
    c.smX += (c.mouseX - c.smX) * 0.04;
    c.smY += (c.mouseY - c.smY) * 0.04;

    camera.position.set(c.cX + c.smX * PARALLAX_X, c.cY + c.smY * PARALLAX_Y, c.cDist);
    camera.lookAt(c.cX, c.cY, 0);
  });

  const onNodeClick = useCallback((node: NodeDef, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const c = ctrl.current;
    const ne = e.nativeEvent;
    if (Math.hypot(ne.clientX - c.downX, ne.clientY - c.downY) > DRAG_THRESHOLD) return;
    c.tX = node.x;
    c.tY = node.y;
    c.tDist = FOCUS_DIST;
  }, []);

  return (
    <>

      <fog attach="fog" args={['#0a0a0f', 10, 28]} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 12, 10]} intensity={0.7} />
      <pointLight position={[0, -1, 5]} intensity={0.5} color="#ffd54f" distance={18} decay={2} />
      <pointLight position={[0, 10, 5]} intensity={0.3} color="#90caf9" distance={18} decay={2} />

      <Trunk />

      {NODES.filter(n => n.parentId !== null).map(n => (
        <BranchTube key={n.id} parent={NODES[n.parentId!]} child={n} />
      ))}

      {NODES.map((node, i) => (
        <SkillNode
          key={node.id}
          node={node}
          pos={POS[i]}
          isHovered={hovered === node.id}
          onHover={handleHover}
          onClick={onNodeClick}
        />
      ))}
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────

export default function SkillTreeV2() {
  return (
    <Canvas
      camera={{ position: [0, 4.5, CAMERA_DIST], fov: 50, near: 0.1, far: 100 }}
      gl={{ antialias: true }}
      style={{ background: '#0a0a0f' }}
    >
      <Scene />
    </Canvas>
  );
}
