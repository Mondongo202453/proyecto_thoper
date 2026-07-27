import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Float, Center } from '@react-three/drei';

const FloatingLogo = () => {
  return (
    <Float speed={1.2} rotationIntensity={0.5} floatIntensity={0.9}>
      <mesh>
        <torusKnotGeometry args={[0.9, 0.3, 128, 16]} />
        <meshStandardMaterial metalness={0.8} roughness={0.2} color="#FF8A00" emissive="#1a1a1a" />
      </mesh>
    </Float>
  );
};

const Hero3D: React.FC = () => {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight intensity={0.6} position={[5, 5, 5]} />
        <directionalLight intensity={0.2} position={[-5, -5, -5]} />
        <Suspense fallback={null}>
          <Center>
            <FloatingLogo />
          </Center>
        </Suspense>
        <OrbitControls enableZoom={false} enableRotate={false} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  );
};

export default Hero3D;
