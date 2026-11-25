"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, MeshTransmissionMaterial, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const PAGE_BG = new THREE.Color("#f3f3ef");

/** Rounded-square ring (the "portal") built from a 2D shape with a hole, then extruded. */
function portalGeometry(): THREE.ExtrudeGeometry {
  const rounded = (size: number, r: number): THREE.Path => {
    const s = size / 2;
    const p = new THREE.Path();
    p.moveTo(-s + r, -s);
    p.lineTo(s - r, -s); p.quadraticCurveTo(s, -s, s, -s + r);
    p.lineTo(s, s - r); p.quadraticCurveTo(s, s, s - r, s);
    p.lineTo(-s + r, s); p.quadraticCurveTo(-s, s, -s, s - r);
    p.lineTo(-s, -s + r); p.quadraticCurveTo(-s, -s, -s + r, -s);
    return p;
  };
  const outer = new THREE.Shape(rounded(3.2, 0.95).getPoints(48));
  outer.holes.push(rounded(2.15, 0.6));
  const geo = new THREE.ExtrudeGeometry(outer, { depth: 0.55, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 8, curveSegments: 48 });
  geo.center();
  return geo;
}

function Portal({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(portalGeometry, []);
  useFrame((state) => {
    if (!group.current || still) return;
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = Math.sin(t * 0.35) * 0.45 + state.pointer.x * 0.25;
    group.current.rotation.x = Math.cos(t * 0.3) * 0.12 - state.pointer.y * 0.15;
  });
  return (
    <group ref={group} rotation={[0.1, -0.5, 0]}>
      <mesh geometry={geometry}>
        <MeshTransmissionMaterial
          samples={6} resolution={512} thickness={0.6} roughness={0.08} transmission={1} ior={1.35}
          chromaticAberration={0.06} anisotropy={0.2} distortion={0.15} distortionScale={0.3} temporalDistortion={0.05}
          color="#ffffff" background={PAGE_BG} backside
        />
      </mesh>
      <Float speed={still ? 0 : 2} rotationIntensity={0.6} floatIntensity={0.6}>
        <RoundedBox args={[0.62, 0.62, 0.62]} radius={0.1} smoothness={6}>
          <meshStandardMaterial color="#c8f53b" roughness={0.3} metalness={0.1} emissive="#9ccc1c" emissiveIntensity={0.25} />
        </RoundedBox>
      </Float>
    </group>
  );
}

export default function HeroVisual() {
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <Canvas camera={{ position: [0, 0, 6.4], fov: 38 }} dpr={[1, 1.8]} gl={{ antialias: true, alpha: true }} frameloop={still ? "demand" : "always"}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <Portal still={still} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 4, -4]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2} color="#dfe6ff" position={[-5, 0, 1]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={2} color="#ffe9e6" position={[5, 0, 1]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="ring" intensity={4} color="#ffffff" position={[0, 0, 6]} scale={3} />
      </Environment>
    </Canvas>
  );
}
