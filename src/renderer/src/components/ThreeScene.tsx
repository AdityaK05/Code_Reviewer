import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'

// Simple rotating cube – demonstrates 3‑D integration.
export default function ThreeScene() {
  return (
    <Canvas camera={{ position: [2, 2, 2] }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#3b82f6" metalness={0.3} roughness={0.4} />
        </mesh>
        <Stars radius={100} depth={50} count={5000} factor={4} />
        <OrbitControls enableZoom={false} />
      </Suspense>
    </Canvas>
  )
}
