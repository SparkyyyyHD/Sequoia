'use client';

import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { useRef, useState, useCallback, useEffect, useMemo, memo } from 'react';
import * as THREE from 'three';

const TREE_HEIGHT = 16;
const CAMERA_DIST = 14;
const FOCUS_DIST = 9;
const Y_MIN = -1;
const Y_MAX = TREE_HEIGHT;
const SCROLL_SPEED = 0.012;
const CAM_LERP = 0.06;
const ROT_LERP = 0.08;
const INERTIA_DECAY = 0.94;
const DRAG_THRESHOLD = 5;

// ─── Tree data ──────────────────────────────────────────────

interface NodeDef {
  id: number;
  parentId: number | null;
  depth: number;
  y: number;
  angle: number;
  radius: number;
  color: string;
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const MAIN_ANGLES = [20, 150, 265];
const PALETTES = [
  { l1: '#4fc3f7', l2: '#29b6f6', l3: '#b3e5fc' },
  { l1: '#81c784', l2: '#66bb6a', l3: '#c8e6c9' },
  { l1: '#ff8a65', l2: '#ff7043', l3: '#ffccbc' },
];

function generateTree(): NodeDef[] {
  const nodes: NodeDef[] = [];
  let id = 0;

  nodes.push({
    id: id++, parentId: null, depth: 0,
    y: 1, angle: 0, radius: 0, color: '#ffd54f',
  });

  for (let i = 0; i < 3; i++) {
    nodes.push({
      id: id++, parentId: 0, depth: 1,
      y: 4.5 + hash(i) * 1.0,
      angle: MAIN_ANGLES[i],
      radius: 2.5,
      color: PALETTES[i].l1,
    });
  }

  for (let i = 0; i < 3; i++) {
    const mainId = i + 1;
    const center = MAIN_ANGLES[i];
    for (let j = 0; j < 10; j++) {
      const t = j / 9;
      const s = i * 10 + j;
      nodes.push({
        id: id++, parentId: mainId, depth: 2,
        y: 8.0 + t * 2.0 + hash(s + 50) * 0.4,
        angle: center - 55 + t * 110 + hash(s + 100) * 3,
        radius: 4.2 + t * 1.2 + hash(s + 200) * 0.3,
        color: PALETTES[i].l2,
      });
    }
  }

  const subStart = 4;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 10; j++) {
      const subIdx = subStart + i * 10 + j;
      const sub = nodes[subIdx];
      for (let k = 0; k < 10; k++) {
        const t = k / 9;
        const s = i * 100 + j * 10 + k;
        nodes.push({
          id: id++, parentId: subIdx, depth: 3,
          y: sub.y + 2.0 + t * 3.5 + hash(s + 1000) * 0.6,
          angle: sub.angle - 5 + t * 10 + hash(s + 2000) * 1.5,
          radius: 6.5 + t * 2.5 + hash(s + 3000) * 0.5,
          color: PALETTES[i].l3,
        });
      }
    }
  }

  return nodes;
}

// ─── Precomputed geometry ───────────────────────────────────

const NODES = generateTree();

function toXYZ(n: NodeDef): [number, number, number] {
  const a = (n.angle * Math.PI) / 180;
  return [Math.sin(a) * n.radius, n.y, Math.cos(a) * n.radius];
}

const POSITIONS = NODES.map(toXYZ);
const NODE_SCALE = [0.45, 0.40, 0.30, 0.15];

interface BranchDef {
  start: [number, number, number];
  end: [number, number, number];
  rTop: number;
  rBot: number;
  color: string;
}

const THICK_START = [0.20, 0.12, 0.06];
const THICK_END   = [0.12, 0.06, 0.03];
const BR_COLORS   = ['#3e2723', '#5d4037', '#6d4c41'];

const THICK_BRANCHES: BranchDef[] = [
  { start: [0, -0.5, 0], end: POSITIONS[0], rTop: 0.20, rBot: 0.24, color: '#3e2723' },
  ...NODES.filter(n => n.parentId !== null && n.depth <= 2).map(n => {
    const p = NODES[n.parentId!];
    const d = Math.min(p.depth, 2);
    return {
      start: POSITIONS[p.id],
      end: POSITIONS[n.id],
      rBot: THICK_START[d],
      rTop: THICK_END[d],
      color: BR_COLORS[d],
    };
  }),
];

const LEAF_VERTS = new Float32Array(
  NODES.filter(n => n.depth === 3 && n.parentId !== null).flatMap(n => {
    const p = POSITIONS[n.parentId!];
    const c = POSITIONS[n.id];
    return [...p, ...c];
  }),
);

function shortAngleDist(from: number, to: number) {
  const TAU = Math.PI * 2;
  const d = ((to - from) % TAU + TAU) % TAU;
  return d > Math.PI ? d - TAU : d;
}

// ─── Branch cylinder ────────────────────────────────────────

function Branch({ def }: { def: BranchDef }) {
  const { mid, quat, len } = useMemo(() => {
    const s = new THREE.Vector3(...def.start);
    const e = new THREE.Vector3(...def.end);
    const dir = e.clone().sub(s);
    const l = dir.length();
    return {
      mid: s.clone().add(e).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), dir.normalize(),
      ),
      len: l,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[def.rTop, def.rBot, len, 6]} />
      <meshStandardMaterial color={def.color} roughness={0.8} />
    </mesh>
  );
}

// ─── Leaf branches (300 segments, 1 draw call) ──────────────

function LeafBranches() {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(LEAF_VERTS, 3));
    return g;
  }, []);

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color="#8d6e63" transparent opacity={0.3} />
    </lineSegments>
  );
}

// ─── Interactive node (memo'd — only re-renders on prop change) ─

interface SkillNodeProps {
  node: NodeDef;
  pos: [number, number, number];
  isHovered: boolean;
  onHover: (id: number | null) => void;
  onClick: (node: NodeDef, e: ThreeEvent<MouseEvent>) => void;
  geom: THREE.SphereGeometry;
}

const SkillNode = memo(function SkillNode({
  node, pos, isHovered, onHover, onClick, geom,
}: SkillNodeProps) {
  const scale = NODE_SCALE[Math.min(node.depth, 3)] * (isHovered ? 1.4 : 1);

  return (
    <mesh
      position={pos}
      scale={scale}
      geometry={geom}
      onPointerOver={(e) => { e.stopPropagation(); onHover(node.id); }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => onClick(node, e)}
    >
      <meshStandardMaterial
        color={isHovered ? '#ffffff' : node.color}
        emissive={node.color}
        emissiveIntensity={isHovered ? 0.6 : 0.15}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
});

// ─── Main scene ─────────────────────────────────────────────

function Scene() {
  const { camera, gl } = useThree();
  const treeRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState<number | null>(null);

  const nodeGeom = useMemo(() => new THREE.SphereGeometry(1, 12, 12), []);

  const ctrl = useRef({
    tY: 7, cY: 7,
    tRot: 0, cRot: 0, rVel: 0,
    tDist: CAMERA_DIST, cDist: CAMERA_DIST,
    drag: false, lastX: 0, downX: 0, downY: 0,
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
      ctrl.current.tDist = CAMERA_DIST;
    };

    const onDown = (e: PointerEvent) => {
      const c = ctrl.current;
      c.drag = true; c.lastX = e.clientX;
      c.downX = e.clientX; c.downY = e.clientY;
      c.rVel = 0;
      el.style.cursor = 'grabbing';
    };

    const onMove = (e: PointerEvent) => {
      const c = ctrl.current;
      if (!c.drag) return;
      const dx = e.clientX - c.lastX;
      c.rVel = dx * 0.005;
      c.tRot += dx * 0.005;
      c.lastX = e.clientX;
      if (Math.hypot(e.clientX - c.downX, e.clientY - c.downY) > DRAG_THRESHOLD) {
        c.tDist = CAMERA_DIST;
      }
    };

    const onUp = () => { ctrl.current.drag = false; el.style.cursor = 'grab'; };

    const resetView = () => {
      const c = ctrl.current;
      c.tY = 7; c.tDist = CAMERA_DIST;
      c.tRot = c.cRot + shortAngleDist(c.cRot, 0);
      c.rVel = 0;
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
    if (!c.drag) {
      c.tRot += c.rVel;
      c.rVel *= INERTIA_DECAY;
      if (Math.abs(c.rVel) < 1e-4) c.rVel = 0;
    }
    c.cY += (c.tY - c.cY) * CAM_LERP;
    c.cRot += (c.tRot - c.cRot) * ROT_LERP;
    c.cDist += (c.tDist - c.cDist) * CAM_LERP;
    treeRef.current.rotation.y = c.cRot;
    camera.position.set(0, c.cY, c.cDist);
    camera.lookAt(0, c.cY, 0);
  });

  const onNodeClick = useCallback((node: NodeDef, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const c = ctrl.current;
    const ne = e.nativeEvent;
    if (Math.hypot(ne.clientX - c.downX, ne.clientY - c.downY) > DRAG_THRESHOLD) return;
    if (node.radius > 0) {
      const angleRad = (node.angle * Math.PI) / 180;
      c.tRot = c.cRot + shortAngleDist(c.cRot, -angleRad);
    }
    c.tY = node.y;
    c.tDist = FOCUS_DIST;
    c.rVel = 0;
  }, []);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 15, 8]} intensity={0.8} />
      <pointLight position={[-3, 8, -5]} intensity={0.3} color="#b388ff" />

      <group ref={treeRef}>
        {THICK_BRANCHES.map((def, i) => (
          <Branch key={i} def={def} />
        ))}
        <LeafBranches />
        {NODES.map((node, i) => (
          <SkillNode
            key={node.id}
            node={node}
            pos={POSITIONS[i]}
            isHovered={hovered === node.id}
            onHover={handleHover}
            onClick={onNodeClick}
            geom={nodeGeom}
          />
        ))}
      </group>
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────

export default function SkillTreeScene() {
  return (
    <Canvas
      camera={{ position: [0, 7, CAMERA_DIST], fov: 50, near: 0.1, far: 100 }}
      gl={{ antialias: true }}
      style={{ background: '#0a0a0f' }}
    >
      <fog attach="fog" args={['#0a0a0f', 18, 40]} />
      <Scene />
    </Canvas>
  );
}
