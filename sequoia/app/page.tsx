/* ============================================================================
 * TEMP: React Three Fiber smoke test — delete this block when you’re done.
 * Everything for the 3D demo lives in this file only (no extra folders).
 * ============================================================================ */

"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function RotatingBox() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.rotation.y += delta * 0.9;
    mesh.rotation.x += delta * 0.45;
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.25, 1.25, 1.25]} />
      <meshStandardMaterial color="#5b7fd1" roughness={0.45} metalness={0.15} />
    </mesh>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Sequoia</h1>

      {/* TEMP: R3F canvas */}
      <div className="h-[min(60vh,420px)] w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-background dark:border-zinc-800">
        <Canvas
          camera={{ position: [2.4, 1.8, 2.8], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 6, 4]} intensity={1.25} />
          <directionalLight position={[-4, 2, -3]} intensity={0.35} color="#a5b4fc" />
          <RotatingBox />
        </Canvas>
      </div>
    </main>
  );
}
