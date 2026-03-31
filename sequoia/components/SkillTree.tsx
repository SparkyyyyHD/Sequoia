'use client';

import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import styles from './SkillTree.module.css';
import { OrthographicCamera } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getForumSectionKey, getJoinedForums, JOINED_FORUMS_CHANGE_EVENT } from '@/lib/joinedForums';
import { FORUM_CATEGORIES, type ForumCategorySlug } from '@/lib/forum';
import {
  TECHNICAL_FIELD_SLUGS,
  TECHNICAL_SKILL_TREES,
  LIFE_SKILL_PILLARS,
  topoSortSkillTree,
  buildTechnicalSkillSubsection,
  type TechnicalFieldSlug,
} from '@/lib/skillTrees';
import { supabase } from '@/lib/supabase';
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
  sectionKey: string | null;
  forumKey: string | null;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
}

interface NodeTarget {
  href: string;
  /** Category or field title (e.g. “Life advice”, “Fishing”). */
  skill: string;
  /** Specific node label (skill name or “Overview”, “Field hub”). */
  nodeLabel: string;
  detail: string;
  categorySlug: ForumCategorySlug | 'forum';
  subsectionSlug: string | null;
}

interface TreeData {
  nodes: NodeDef[];
  targets: Record<number, NodeTarget>;
  positions: [number, number, number][];
}

type VoteTier = 'none' | 'little' | 'more' | 'legendary';

interface VoteTierStyle {
  color: string;
  roughness: number;
  metalness: number;
  emissive: number;
  glowOuter: number;
  glowInner: number;
}

const VOTE_TIER_STYLES: Record<VoteTier, VoteTierStyle> = {
  none: {
    color: '#8c939f',
    roughness: 0.95,
    metalness: 0.02,
    emissive: 0.0,
    glowOuter: 0.03,
    glowInner: 0.06,
  },
  little: {
    color: '#46b971',
    roughness: 0.7,
    metalness: 0.16,
    emissive: 0.1,
    glowOuter: 0.12,
    glowInner: 0.15,
  },
  more: {
    color: '#8a63e8',
    roughness: 0.46,
    metalness: 0.38,
    emissive: 0.2,
    glowOuter: 0.15,
    glowInner: 0.2,
  },
  legendary: {
    color: '#ffb700',
    roughness: 0.18,
    metalness: 0.7,
    emissive: 1.0,
    glowOuter: 0.2,
    glowInner: 0.3,
  },
};

function voteTierForHelpful(helpfulVotes: number): VoteTier {
  if (helpfulVotes <= 0) return 'none';
  if (helpfulVotes < 10) return 'little';
  if (helpfulVotes < 30) return 'more';
  return 'legendary';
}

function getForumKey(category?: string | null, subcategory?: string | null): string | null {
  if (!category || !subcategory) return null;
  return `${category}::${subcategory}`;
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const SIZES = [0.28, 0.23, 0.21, 0.2, 0.19, 0.18, 0.18];
const Y_STEP = 1.7;
const MIN_SUBTREE_SPAN = 0.58;
const ROOT_CLUSTER_GAP = 0.22;
const CHILD_CLUSTER_GAP = 0.1;
const CHILD_CLUSTER_DEPTH_GAIN = 0.03;
const HORIZONTAL_PACK_SCALE = 0.64;
// Z_SCALE defined above with other camera constants
const Z_MAX_ACC = 5;
const SKILL_BASE_COLORS = ['#6ec5ff', '#7ad78f', '#ff9966', '#f7be4b', '#c79dff', '#4cd7c2', '#ff7ca2', '#9fd06f', '#73a1ff'];

function toneColor(hex: string, depth: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, THREE.MathUtils.clamp(hsl.s + 0.06, 0, 1), THREE.MathUtils.clamp(hsl.l + depth * 0.045, 0.25, 0.84));
  return `#${c.getHexString()}`;
}

/**
 * When a skill lists several prerequisites, we attach the 3D branch to the deepest
 * one so parallel tracks visually merge instead of looking like one straight spine.
 */
function hubParentAndDepth(
  requires: string[],
  slugToId: Map<string, number>,
  slugDepth: Map<string, number>,
  hubId: number,
): { parentId: number; depth: number } {
  if (requires.length === 0) return { parentId: hubId, depth: 1 };
  let parentId = hubId;
  let maxD = 0;
  for (const r of requires) {
    const id = slugToId.get(r);
    if (id === undefined) continue;
    const d = slugDepth.get(r) ?? 1;
    if (d > maxD) {
      maxD = d;
      parentId = id;
    }
  }
  return { parentId, depth: maxD + 1 };
}

function buildSkillForest2D(
  joinedSectionKeys: Set<string>,
): { nodes: Omit<NodeDef, 'z'>[]; targets: Record<number, NodeTarget> } {
  const nodes: Omit<NodeDef, 'z'>[] = [];
  const targets: Record<number, NodeTarget> = {};
  const childrenByParent = new Map<number, number[]>();

  function addNode(
    parentId: number | null,
    family: number,
    sectionKey: string | null,
    forumKey: string | null,
    x: number,
    y: number,
    depth: number,
    color: string,
    size: number,
    target: NodeTarget,
  ): number {
    const id = nodes.length;
    nodes.push({
      id,
      parentId,
      depth,
      family,
      sectionKey,
      forumKey,
      x,
      y,
      color,
      size,
    });
    targets[id] = target;
    if (parentId !== null) {
      const arr = childrenByParent.get(parentId) ?? [];
      arr.push(id);
      childrenByParent.set(parentId, arr);
    }
    return id;
  }

  const rootId = addNode(
    null,
    -1,
    null,
    null,
    0,
    0,
    0,
    '#ffd54f',
    0.32,
    {
      href: '/forum',
      skill: 'Forum',
      nodeLabel: 'Root',
      detail: 'Entry point for every skill forum path.',
      categorySlug: 'forum',
      subsectionSlug: null,
    },
  );

  for (let pi = 0; pi < LIFE_SKILL_PILLARS.length; pi++) {
    const pillar = LIFE_SKILL_PILLARS[pi];
    if (!joinedSectionKeys.has(getForumSectionKey('life-advice', pillar.slug))) continue;
    const pillarFamily = pi;
    const sectionKey = getForumSectionKey('life-advice', pillar.slug);
    const pillarForumKey = getForumKey('life-advice', pillar.slug);
    const pillarHubId = addNode(
      rootId,
      pillarFamily,
      sectionKey,
      pillarForumKey,
      0,
      Y_STEP,
      1,
      toneColor(SKILL_BASE_COLORS[pillarFamily % SKILL_BASE_COLORS.length], 0),
      SIZES[1],
      {
        href: `/forum/life-advice/${pillar.slug}`,
        skill: 'Life advice',
        nodeLabel: pillar.label,
        detail: pillar.description,
        categorySlug: 'life-advice',
        subsectionSlug: pillar.slug,
      },
    );

    const lifeOrder = topoSortSkillTree(pillar.nodes);
    const lifeSlugToId = new Map<string, number>();
    const lifeSlugDepth = new Map<string, number>();

    for (const n of lifeOrder) {
      const { parentId, depth: d } = hubParentAndDepth(n.requires, lifeSlugToId, lifeSlugDepth, pillarHubId);
      lifeSlugDepth.set(n.slug, d);
      const nid = addNode(
        parentId,
        pillarFamily,
        sectionKey,
        getForumKey('life-advice', n.slug),
        0,
        0,
        0,
        toneColor(SKILL_BASE_COLORS[pillarFamily % SKILL_BASE_COLORS.length], Math.min(d, 5)),
        SIZES[Math.min(d, SIZES.length - 1)],
        {
          href: `/forum/life-advice/${pillar.slug}`,
          skill: pillar.label,
          nodeLabel: n.label,
          detail: n.description,
          categorySlug: 'life-advice',
          subsectionSlug: n.slug,
        },
      );
      lifeSlugToId.set(n.slug, nid);
    }
  }

  const techCat = FORUM_CATEGORIES.find((c) => c.slug === 'technical-advice')!;
  const techFamilyOffset = LIFE_SKILL_PILLARS.length;
  for (let fi = 0; fi < TECHNICAL_FIELD_SLUGS.length; fi++) {
    const field = TECHNICAL_FIELD_SLUGS[fi];
    if (!joinedSectionKeys.has(getForumSectionKey('technical-advice', field))) continue;
    const fieldSub = techCat.subsections.find((s) => s.slug === field)!;
    const fieldFamily = techFamilyOffset + fi;
    const sectionKey = getForumSectionKey('technical-advice', field);
    const fieldForumKey = getForumKey('technical-advice', field);
    const fieldNodeId = addNode(
      rootId,
      fieldFamily,
      sectionKey,
      fieldForumKey,
      0,
      Y_STEP,
      1,
      toneColor(SKILL_BASE_COLORS[fieldFamily % SKILL_BASE_COLORS.length], 0),
      SIZES[1],
      {
        href: `/forum/technical-advice/${field}`,
        skill: fieldSub.label,
        nodeLabel: 'Field hub',
        detail: fieldSub.description,
        categorySlug: 'technical-advice',
        subsectionSlug: field,
      },
    );

    const order = topoSortSkillTree(TECHNICAL_SKILL_TREES[field as TechnicalFieldSlug]);
    const slugToId = new Map<string, number>();
    const slugDepth = new Map<string, number>();

    for (const n of order) {
      const { parentId, depth: d } = hubParentAndDepth(n.requires, slugToId, slugDepth, fieldNodeId);
      slugDepth.set(n.slug, d);
      const nid = addNode(
        parentId,
        fieldFamily,
        sectionKey,
        getForumKey('technical-advice', buildTechnicalSkillSubsection(field, n.slug)),
        0,
        0,
        0,
        toneColor(SKILL_BASE_COLORS[fieldFamily % SKILL_BASE_COLORS.length], Math.min(d, 5)),
        SIZES[Math.min(d, SIZES.length - 1)],
        {
          href: `/forum/technical-advice/${field}`,
          skill: fieldSub.label,
          nodeLabel: n.label,
          detail: n.description,
          categorySlug: 'technical-advice',
          subsectionSlug: buildTechnicalSkillSubsection(field, n.slug),
        },
      );
      slugToId.set(n.slug, nid);
    }
  }

  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    const ch = childrenByParent.get(id) ?? [];
    for (const c of ch) {
      nodes[c].depth = nodes[id].depth + 1;
      queue.push(c);
    }
  }

  function clusterGap(depth: number) {
    return CHILD_CLUSTER_GAP + Math.min(Math.max(depth - 1, 0) * CHILD_CLUSTER_DEPTH_GAIN, 0.18);
  }

  const subtreeSpanCache = new Map<number, number>();

  function subtreeSpan(nodeIdx: number): number {
    const cached = subtreeSpanCache.get(nodeIdx);
    if (cached !== undefined) return cached;

    const ch = childrenByParent.get(nodeIdx) ?? [];
    if (ch.length === 0) {
      subtreeSpanCache.set(nodeIdx, MIN_SUBTREE_SPAN);
      return MIN_SUBTREE_SPAN;
    }

    const gap = clusterGap(nodes[nodeIdx].depth);
    const span = Math.max(
      MIN_SUBTREE_SPAN,
      ch.reduce((sum, cid) => sum + subtreeSpan(cid), 0) + gap * (ch.length - 1),
    );
    subtreeSpanCache.set(nodeIdx, span);
    return span;
  }

  function layoutSubtree(nodeIdx: number) {
    const ch = childrenByParent.get(nodeIdx) ?? [];
    if (ch.length === 0) return;

    const px = nodes[nodeIdx].x;
    const pd = nodes[nodeIdx].depth;
    const gap = clusterGap(pd);
    const totalSpan = ch.reduce((sum, cid) => sum + subtreeSpan(cid), 0) + gap * (ch.length - 1);
    let cursor = px - totalSpan / 2;

    ch.forEach((cid) => {
      const childSpan = subtreeSpan(cid);
      nodes[cid].x = cursor + childSpan / 2;
      nodes[cid].y = (pd + 1) * Y_STEP;
      cursor += childSpan + gap;
      layoutSubtree(cid);
    });
  }

  const rootChildren = childrenByParent.get(rootId) ?? [];
  const totalRootSpan =
    rootChildren.reduce((sum, cid) => sum + subtreeSpan(cid), 0) +
    ROOT_CLUSTER_GAP * Math.max(rootChildren.length - 1, 0);
  let rootCursor = -totalRootSpan / 2;

  for (const cid of rootChildren) {
    const childSpan = subtreeSpan(cid);
    nodes[cid].x = rootCursor + childSpan / 2;
    nodes[cid].y = Y_STEP;
    rootCursor += childSpan + ROOT_CLUSTER_GAP;
    layoutSubtree(cid);
  }

  for (let i = 1; i < nodes.length; i++) {
    nodes[i].x *= HORIZONTAL_PACK_SCALE;
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

function buildNodes(joinedSectionKeys: Set<string>): TreeData {
  const { nodes: base, targets } = buildSkillForest2D(joinedSectionKeys);
  const zs = liftZ(base);
  const nodes = base.map((n, i) => ({ ...n, z: zs[i] }));
  return {
    nodes,
    targets,
    positions: nodes.map((n) => [n.x, n.y, n.z]),
  };
}
// Branch radii taper strongly with depth so deeper branches look thin/delicate
const BR_R = [0.102, 0.066, 0.045, 0.032, 0.021, 0.014, 0.010];
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

function treeAxisBounds(nodes: NodeDef[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.size);
    maxX = Math.max(maxX, n.x + n.size);
    minY = Math.min(minY, n.y - n.size);
    maxY = Math.max(maxY, n.y + n.size);
  }
  return { minX, maxX, minY, maxY };
}

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
  nodes: NodeDef[],
  pad = TREE_PAD,
): { left: number; right: number; top: number; bottom: number } {
  if (vw <= 0 || vh <= 0) {
    return { left: -1, right: 1, top: 1, bottom: -1 };
  }
  const { minX, maxX, maxY } = treeAxisBounds(nodes);
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
function buildForestBackgroundTrees(bounds: { minX: number; maxX: number }): BgTreeDef[] {
  const out: BgTreeDef[] = [];
  const { minX, maxX } = bounds;
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

const MIST_VS = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const MIST_FS = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uDensity;
  uniform float uSpeed;
  uniform vec3 uTint;

  float n(vec2 p) {
    return sin(p.x) * sin(p.y);
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv * 7.0;
    float t = uTime * uSpeed;
    float f = n(p + vec2(t * 0.7, t * 0.24));
    f += 0.55 * n(p * 1.9 - vec2(t * 0.35, -t * 0.17));
    f += 0.25 * n(p * 3.7 + vec2(-t * 0.18, t * 0.29));
    f = f / (1.0 + 0.55 + 0.25);
    f = f * 0.5 + 0.5;

    float vertical = smoothstep(0.0, 0.26, uv.y) * (1.0 - smoothstep(0.58, 1.0, uv.y));
    float alpha = smoothstep(0.35, 0.92, f) * vertical * uDensity;
    gl_FragColor = vec4(uTint, alpha);
  }
`;

const RAY_VS = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RAY_FS = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uTint;

  void main() {
    vec2 uv = vUv;
    vec2 p = uv - vec2(0.5, 0.18);
    float ang = atan(p.y, p.x);
    float rad = length(p);
    float beam = smoothstep(0.0, 0.95, 1.0 - rad);
    float streak = 0.5 + 0.5 * sin(ang * 16.0 + uTime * 0.35);
    float alpha = beam * (0.04 + streak * 0.08) * smoothstep(0.02, 0.85, uv.y);
    gl_FragColor = vec4(uTint, alpha);
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

function BackgroundForest({ bgTrees }: { bgTrees: BgTreeDef[] }) {
  return (
    <>
      <SceneBackdrop />
      {bgTrees.map((t) => (
        <BackgroundTree key={t.id} tree={t} />
      ))}
    </>
  );
}

function VolumetricMistLayer({
  position,
  size,
  tint,
  density,
  speed,
  rotation = 0,
  order = -6,
}: {
  position: [number, number, number];
  size: [number, number];
  tint: string;
  density: number;
  speed: number;
  rotation?: number;
  order?: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const tintColor = useMemo(() => new THREE.Color(tint), [tint]);

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh position={position} rotation={[0, 0, rotation]} renderOrder={order}>
      <planeGeometry args={size} />
      <shaderMaterial
        ref={matRef}
        vertexShader={MIST_VS}
        fragmentShader={MIST_FS}
        transparent
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uDensity: { value: density },
          uSpeed: { value: speed },
          uTint: { value: tintColor },
        }}
      />
    </mesh>
  );
}

function LightShafts() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh position={[0, 4.8, -12]} rotation={[0, 0, 0.06]} renderOrder={-7}>
      <planeGeometry args={[72, 42]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={RAY_VS}
        fragmentShader={RAY_FS}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uTint: { value: new THREE.Color('#dff0e5') },
        }}
      />
    </mesh>
  );
}

function AtmosphereFX() {
  return (
    <>
      <LightShafts />
      <VolumetricMistLayer
        position={[0, 0.45, -8.4]}
        size={[66, 22]}
        tint="#d4e6de"
        density={0.2}
        speed={0.12}
      />
      <VolumetricMistLayer
        position={[0, 1.2, -6.2]}
        size={[54, 17]}
        tint="#d9ece3"
        density={0.14}
        speed={0.18}
        rotation={0.025}
      />
      <VolumetricMistLayer
        position={[0, 2.5, -4.3]}
        size={[42, 11]}
        tint="#e6f4ee"
        density={0.1}
        speed={0.25}
      />
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
  forumHelpfulVotes,
}: {
  parent: NodeDef;
  child: NodeDef;
  forumHelpfulVotes: Record<string, number>;
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

  const helpfulVotes = child.forumKey ? (forumHelpfulVotes[child.forumKey] ?? 0) : 0;
  const tier = voteTierForHelpful(helpfulVotes);
  const tierStyle = VOTE_TIER_STYLES[tier];
  const di = Math.min(parent.depth, BR_C.length - 1);
  const color = useMemo(() => {
    const c = new THREE.Color(tierStyle.color);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    const hueJitter = (hash(child.id * 43 + parent.id * 17) - 0.5) * 0.045;
    const satBoost = tier === 'none' ? 0.0 : 0.03 + hash(child.id * 89) * 0.08;
    const lightJitter = (hash(child.id * 131) - 0.5) * 0.12;
    const depthLift = parent.depth * 0.012;
    c.setHSL(
      (hsl.h + hueJitter + 1) % 1,
      THREE.MathUtils.clamp(hsl.s + satBoost, 0, 1),
      THREE.MathUtils.clamp(hsl.l + lightJitter + depthLift, 0.25, 0.78),
    );
    return c;
  }, [tierStyle.color, tier, child.id, parent.id, parent.depth]);
  const roughness = tierStyle.roughness;
  const metalness = tierStyle.metalness;

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
          emissive={color.clone().multiplyScalar(tierStyle.emissive)}
          emissiveIntensity={Math.max(0.04, tierStyle.emissive)}
        />
      </mesh>
    </group>
  );
});

interface SkillNodeProps {
  node: NodeDef;
  pos: [number, number, number];
  forumHelpfulVotes: Record<string, number>;
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
  forumHelpfulVotes,
  isHovered,
  onHover,
  onClick,
}: SkillNodeProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const glowOuterRef = useRef<THREE.MeshBasicMaterial>(null!);
  const glowInnerRef = useRef<THREE.MeshBasicMaterial>(null!);

  const helpfulVotes = node.forumKey ? (forumHelpfulVotes[node.forumKey] ?? 0) : 0;
  const tier = voteTierForHelpful(helpfulVotes);
  const tierStyle = VOTE_TIER_STYLES[tier];
  const baseColor = useMemo(() => {
    const c = new THREE.Color(tierStyle.color);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + node.depth * 0.012, 0.22, 0.84));
    return c;
  }, [tierStyle.color, node.depth]);
  const white = useMemo(() => new THREE.Color('#ffffff'), []);
  const shape = useMemo(() => nodeShapeIndex(node), [node]);
  const pulse = useMemo(() => 0.8 + hash(node.id * 17.3) * 1.2, [node.id]);
  const tilt = useMemo(() => (hash(node.id * 41.7) - 0.5) * 0.45, [node.id]);
  const initRotX = useMemo(() => hash(node.id * 53.1) * Math.PI * 2, [node.id]);
  const initRotY = useMemo(() => hash(node.id * 97.4) * Math.PI * 2, [node.id]);
  const initRotZ = useMemo(() => hash(node.id * 149.2) * Math.PI * 2, [node.id]);

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
      isHovered ? Math.max(0.9, tierStyle.emissive * 2.4) : tierStyle.emissive,
      0.12,
    );
    glowOuter.opacity = THREE.MathUtils.lerp(glowOuter.opacity, isHovered ? 0.4 : tierStyle.glowOuter, 0.1);
    glowInner.opacity = THREE.MathUtils.lerp(glowInner.opacity, isHovered ? 0.55 : tierStyle.glowInner, 0.1);
  });

  return (
    <group ref={groupRef} position={pos}>
      <mesh>
        {renderPolyGeometry(node.size * 2.1)}
        <meshBasicMaterial
          ref={glowOuterRef}
          color={baseColor}
          transparent
          opacity={tierStyle.glowOuter}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        {renderPolyGeometry(node.size * 1.52)}
        <meshBasicMaterial
          ref={glowInnerRef}
          color={baseColor}
          transparent
          opacity={tierStyle.glowInner}
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
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={tierStyle.emissive}
          roughness={tierStyle.roughness}
          metalness={tierStyle.metalness}
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
  treeData,
  forumHelpfulVotes,
  hovered,
  onHover,
  onNodeClick,
}: {
  treeData: TreeData;
  forumHelpfulVotes: Record<string, number>;
  hovered: number | null;
  onHover: (id: number | null) => void;
  onNodeClick: (node: NodeDef, e: ThreeEvent<MouseEvent>) => void;
}) {
  const { nodes, positions } = treeData;

  return (
    <>
      <Trunk />
      {nodes.filter((n) => n.parentId !== null).map((n) => (
        <BranchTube
          key={n.id}
          parent={nodes[n.parentId!]}
          child={n}
          forumHelpfulVotes={forumHelpfulVotes}
        />
      ))}
      {nodes.map((node) => (
        <SkillNode
          key={node.id}
          node={node}
          pos={positions[node.id]}
          forumHelpfulVotes={forumHelpfulVotes}
          isHovered={hovered === node.id}
          onHover={onHover}
          onClick={onNodeClick}
        />
      ))}
    </>
  );
}

interface OrthoSkillSceneProps {
  treeData: TreeData;
  bgTrees: BgTreeDef[];
  forumHelpfulVotes: Record<string, number>;
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
function OrthoSkillScene(props: OrthoSkillSceneProps) {
  const {
    viewPixels,
    viewState: vsProp,
    setViewState: setVsProp,
    enableTilt = true,
    onNodeHover,
    onNodeActivate,
    treeData,
    bgTrees,
    forumHelpfulVotes,
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
    const base = orthoFrustumForViewport(vw, vh, treeData.nodes);
    return applyViewState(base, vs);
  }, [vw, vh, vs, treeData.nodes]);

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
      // eslint-disable-next-line react-hooks/immutability
      gl.domElement.style.cursor = id !== null ? 'pointer' : 'grab';
    },
    [gl, onNodeHover],
  );

  useFrame(() => {
    if (!worldFrustum) return;
    const { left, right, top, bottom, cx, cy } = worldFrustumToCameraLocal(worldFrustum);
    const cam = camera as THREE.OrthographicCamera;
    if (!cam.isOrthographicCamera) return;
    /* eslint-disable react-hooks/immutability */
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
    /* eslint-enable react-hooks/immutability */

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
  const original = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = original;
  };
}, []);
  useEffect(() => {
    const el = gl.domElement;
    // eslint-disable-next-line react-hooks/immutability
    el.style.cursor = 'grab';

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetVsRef.current = null;
      if (vw <= 0 || vh <= 0) return;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;  // mouse pixels from canvas left
      const my = e.clientY - rect.top;   // mouse pixels from canvas top

      setVs((prev) => {
        const base = orthoFrustumForViewport(vw, vh, treeData.nodes);
        const cur = applyViewState(base, prev);
        const baseCx = (base.left + base.right) / 2;
        const baseCy = (base.bottom + base.top) / 2;

        // World position under mouse with current frustum
        const mwx = cur.left + (mx / vw) * (cur.right - cur.left);
        const mwy = cur.bottom + (1 - my / vh) * (cur.top - cur.bottom);

        const newZoom = THREE.MathUtils.clamp(
          prev.zoom * (1 + e.deltaY * ZOOM_FACTOR),
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
          const base = orthoFrustumForViewport(vw, vh, treeData.nodes);
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
  }, [gl, vw, vh, setVs, treeData.nodes]);

  const onNodeClick = useCallback(
    (node: NodeDef, e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const c = ctrl.current;
      const ne = e.nativeEvent;
      if (Math.hypot(ne.clientX - c.downX, ne.clientY - c.downY) > DRAG_THRESHOLD) return;
      onNodeActivate?.(node.id);
      if (onNodeActivate) return;
      if (vw <= 0 || vh <= 0) return;
      const b = orthoFrustumForViewport(vw, vh, treeData.nodes);
      const baseCx = (b.left + b.right) / 2;
      const baseCy = (b.bottom + b.top) / 2;
      const targetZoom = Math.min(vsRef.current.zoom, NODE_CLICK_ZOOM);
      targetVsRef.current = { panX: node.x - baseCx, panY: node.y - baseCy, zoom: targetZoom };
    },
    [vw, vh, onNodeActivate, treeData.nodes],
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

      <BackgroundForest bgTrees={bgTrees} />
      <TreeMeshes
        treeData={treeData}
        forumHelpfulVotes={forumHelpfulVotes}
        hovered={hovered}
        onHover={handleHover}
        onNodeClick={onNodeClick}
      />
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

export default function SkillTree() {
  const { displayName } = useAuth();
  const router = useRouter();
  const [activeNodeId, setActiveNodeId] = useState<number>(0);
  const [joinedForums, setJoinedForums] = useState<Set<string>>(() => getJoinedForums());
  const [forumHelpfulVotes, setForumHelpfulVotes] = useState<Record<string, number>>({});

  useEffect(() => {
    function onJoinedChange() {
      setJoinedForums(getJoinedForums());
      setActiveNodeId(0);
    }

    window.addEventListener(JOINED_FORUMS_CHANGE_EVENT, onJoinedChange);
    return () => window.removeEventListener(JOINED_FORUMS_CHANGE_EVENT, onJoinedChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadVotesBySection() {
      if (!displayName) {
        setForumHelpfulVotes({});
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .select('category, subcategory, helpful_count')
        .eq('author_name', displayName);

      if (cancelled) return;
      if (error || !data) {
        setForumHelpfulVotes({});
        return;
      }

      const next: Record<string, number> = {};
      for (const row of data as { category?: string | null; subcategory?: string | null; helpful_count?: number | null }[]) {
        const forumKey = getForumKey(row.category, row.subcategory);
        if (!forumKey) continue;
        next[forumKey] = (next[forumKey] ?? 0) + (row.helpful_count ?? 0);
      }
      setForumHelpfulVotes(next);
    }

    loadVotesBySection();
    return () => {
      cancelled = true;
    };
  }, [displayName]);

  const treeData = useMemo(() => buildNodes(joinedForums), [joinedForums]);
  const bgTrees = useMemo(() => {
    const bounds = treeAxisBounds(treeData.nodes);
    return buildForestBackgroundTrees({ minX: bounds.minX, maxX: bounds.maxX });
  }, [treeData.nodes]);
  const firstVisibleNodeId = useMemo(() => {
    for (const node of treeData.nodes) {
      if (node.id !== 0) {
        return node.id;
      }
    }
    return 0;
  }, [treeData.nodes]);
  const activeVisibleNodeId = treeData.nodes.some((node) => node.id === activeNodeId)
    ? activeNodeId
    : firstVisibleNodeId;
  const activeTarget = treeData.targets[activeVisibleNodeId] ?? treeData.targets[0];
  const handleNodeHover = useCallback((nodeId: number | null) => {
    if (nodeId === null) return;
    setActiveNodeId(nodeId);
  }, []);

  const handleNodeActivate = useCallback(
    (nodeId: number) => {
      const target = treeData.targets[nodeId];
      if (!target) return;
      setActiveNodeId(nodeId);
      router.push(target.href);
    },
    [router, treeData.targets],
  );

  return (
    <div
      className={styles.skilltreeScrollHide}
      style={{
        position: 'relative',
        minHeight: '100dvh',
        width: '100%',
        overflow: 'hidden',
        background: BACKGROUND_COLOR,
      }}
    >
      <Canvas gl={{ antialias: true }} style={{ width: '100%', height: '100dvh', background: BACKGROUND_COLOR }}>
        <OrthoSkillScene
          treeData={treeData}
          bgTrees={bgTrees}
          forumHelpfulVotes={forumHelpfulVotes}
          onNodeHover={handleNodeHover}
          onNodeActivate={handleNodeActivate}
        />
      </Canvas>

      <aside
          style={{
            position: 'absolute',
            right: 12,
            bottom: 70,
            zIndex: 24,
            width: 'min(360px, calc(100% - 24px))',
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
            {activeTarget.skill}
          </p>
          <h3 style={{ margin: '4px 0 0', fontSize: 17, lineHeight: 1.2, color: '#f8fafc' }}>
            {activeTarget.nodeLabel}
          </h3>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#cbd5e1' }}>{activeTarget.detail}</p>
        </aside>
      {treeData.nodes.length === 1 && (
        <aside
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            zIndex: 24,
            maxWidth: 320,
            background: 'rgba(15, 23, 42, 0.84)',
            border: '1px solid rgba(148, 163, 184, 0.52)',
            borderRadius: 10,
            boxShadow: '0 12px 28px rgba(2, 6, 23, 0.35)',
            color: '#e2e8f0',
            backdropFilter: 'blur(7px)',
            padding: '12px 12px 11px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 15, lineHeight: 1.2, color: '#f8fafc' }}>
            Join a section to grow your tree
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#cbd5e1' }}>
            Use the + button in the forum sidebar to add sections back into the tree.
          </p>
        </aside>
      )}
    </div>
  );
}
