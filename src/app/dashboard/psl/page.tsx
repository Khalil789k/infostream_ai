"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, PerspectiveCamera, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, ArrowLeft, Languages, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { textToGloss } from '@/lib/psl/textToGloss';
import { resolvePose } from '@/data/psl/signAnimationMap';
import { useRouter } from 'next/navigation';

function SignAvatarModel({ currentAnimation, progress }: any) {
  const { scene } = useGLTF("/avatar.glb");
  const bones = useRef<Record<string, THREE.Object3D>>({});

  useEffect(() => {
    if (scene.userData.styled) return;

    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const oldMat = mesh.material as THREE.MeshStandardMaterial;
        
        mesh.material = new THREE.MeshToonMaterial({
          color: new THREE.Color("#4ade80"), 
          map: oldMat.map || null,
        });

        if (obj.name.toLowerCase().includes('skin') || obj.name.toLowerCase().includes('head') || obj.name.toLowerCase().includes('hand')) {
          (mesh.material as THREE.MeshToonMaterial).color = new THREE.Color("#ffceb4"); 
        }
        
        if (obj.name.toLowerCase().includes('top') || obj.name.toLowerCase().includes('shirt') || obj.name.toLowerCase().includes('body')) {
          (mesh.material as THREE.MeshToonMaterial).color = new THREE.Color("#3b82f6"); 
        }
      }
      
      if (obj.type === 'Bone' || obj.name.includes('RightHand')) {
        const name = obj.name.replace('mixamorig', '');
        bones.current[name] = obj;
      }
    });

    scene.userData.styled = true;
  }, [scene]);

  useFrame((state) => {
    const pose = resolvePose(currentAnimation, progress, state.clock.elapsedTime);
    
    if (bones.current.RightArm) {
      bones.current.RightArm.rotation.x = THREE.MathUtils.lerp(bones.current.RightArm.rotation.x, pose.rightArmX, 0.2);
      bones.current.RightArm.rotation.z = THREE.MathUtils.lerp(bones.current.RightArm.rotation.z, pose.rightArmZ, 0.2);
    }
    if (bones.current.RightForeArm) {
      bones.current.RightForeArm.rotation.x = THREE.MathUtils.lerp(bones.current.RightForeArm.rotation.x, pose.rightForeArmX, 0.2);
    }
    if (bones.current.LeftArm && pose.leftArmZ !== undefined) {
      bones.current.LeftArm.rotation.z = THREE.MathUtils.lerp(bones.current.LeftArm.rotation.z, pose.leftArmZ, 0.2);
    }

    Object.entries(pose.fingers).forEach(([boneName, rot]: [string, any]) => {
      const bone = bones.current[boneName];
      if (bone) {
        bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, rot.x, 0.2);
        bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, rot.y, 0.2);
        bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, rot.z, 0.2);
      }
      const bone2 = bones.current[boneName.replace('1', '2')];
      if (bone2) bone2.rotation.x = THREE.MathUtils.lerp(bone2.rotation.x, rot.x, 0.2);
    });
  });

  return (
    <group position={[0, -2.0, 0]} rotation={[0, Math.PI, 0]} scale={[2.0, 2.0, 2.0]}>
      <primitive object={scene} />
    </group>
  );
}

export default function PSLPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard');
  }, []);

  const [inputText, setInputText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const result = useMemo(() => textToGloss(inputText || "Hello"), [inputText]);
  const animationQueue = result.animationQueue;
  const currentSign = isPlaying ? (animationQueue[currentIndex] || "Idle") : "Idle";

  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
    setIsPlaying(false);
  }, [inputText]);

  useEffect(() => {
    let timeout: any;
    if (isPlaying && currentIndex < animationQueue.length) {
      timeout = setTimeout(() => {
        if (progress >= 1) {
          if (currentIndex < animationQueue.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
          } else {
            setIsPlaying(false);
            setProgress(1);
          }
        } else {
          setProgress(prev => prev + 0.05);
        }
      }, 25);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, currentIndex, progress, animationQueue.length]);

  const reset = () => {
    setCurrentIndex(0);
    setProgress(0);
    setIsPlaying(false);
  };

  const handleStart = () => {
    setCurrentIndex(0);
    setProgress(0);
    setIsPlaying(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Section: 3D Avatar (Full Width) */}
      <div className="flex-1 w-full bg-[#0f172a] relative overflow-hidden">
        <div className="absolute top-8 left-8 z-10 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/dashboard')}
            className="bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.2, 5.5], fov: 35 }}>
          <ambientLight intensity={0.7} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
          <pointLight position={[-5, 5, -5]} intensity={1} color="#ffffff" />
          <directionalLight position={[0, 2, 4]} intensity={1.5} />
          
          <Suspense fallback={<Html center><div className="text-white/30 text-2xl font-black italic animate-pulse">LOADING AVATAR...</div></Html>}>
            <group position={[0, -0.4, 0]} scale={[-1.2, 1.2, 1.2]}>
              <SignAvatarModel currentAnimation={currentSign} progress={progress} />
            </group>
            <ContactShadows position={[0, -0.5, 0]} opacity={0.6} scale={10} blur={2.5} far={4} />
          </Suspense>
        </Canvas>

        {/* Current Sign Overlay */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSign}
            initial={{ scale: 0.8, opacity: 0, x: 20 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 1.2, opacity: 0, x: -20 }}
            className="absolute top-1/2 right-8 -translate-y-1/2 bg-white/5 backdrop-blur-2xl px-8 py-6 rounded-3xl shadow-2xl border border-white/10 flex flex-col items-center min-w-[120px]"
          >
             <span className="text-4xl font-black text-white uppercase tracking-wider">
               {currentSign === "Idle" ? "READY" : currentSign.replace('Letter_', '')}
             </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Section: Premium Light Controls */}
      <div className="w-full bg-white/95 backdrop-blur-3xl border-t border-slate-200/60 shadow-[0_-20px_40px_rgba(0,0,0,0.03)] z-10 shrink-0 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-8 p-6 md:p-8">
          
          {/* Input Section */}
          <div className="flex-1 w-full relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-cyan-500/5 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative">
              <label className="absolute top-4 left-6 text-[10px] font-black text-indigo-500 uppercase tracking-widest pointer-events-none">ENTER TEXT</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type here..."
                rows={3}
                className="w-full bg-slate-50 rounded-3xl p-6 pt-10 border-2 border-black focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-lg font-bold text-slate-800 resize-none shadow-sm placeholder-slate-400"
              />
            </div>
          </div>

          {/* Grammar Preview */}
          <div className="flex-1 w-full relative">
             <div className="relative h-[110px] bg-indigo-50/80 rounded-3xl p-6 pt-10 border-2 border-black shadow-sm overflow-hidden flex items-center">
               <label className="absolute top-4 left-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest pointer-events-none">PSL GRAMMAR (SOV)</label>
               <p className="text-lg font-bold text-indigo-900 line-clamp-2">
                 {result.glossSyntax || "Waiting for input..."}
               </p>
             </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 w-full md:w-auto h-[110px] relative">
            <Button 
              onClick={handleStart}
              className={`h-full px-10 rounded-3xl font-black text-xl transition-all active:scale-95 flex-1 md:flex-none border-2 border-black ${
                isPlaying 
                  ? 'bg-slate-200 text-slate-400 opacity-80 shadow-none' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_8px_30px_rgba(79,70,229,0.3)]'
              }`}
              disabled={!inputText || isPlaying}
            >
              <Play className={`mr-3 h-7 w-7 fill-current ${isPlaying ? 'opacity-50' : ''}`} />
              <span>{isPlaying ? 'PLAYING...' : 'START'}</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={reset}
              className="h-full px-8 rounded-3xl font-black text-xl border-2 border-black bg-white hover:bg-slate-50 hover:border-black transition-all active:scale-95 text-slate-700 hover:text-black"
              disabled={!inputText}
            >
              <RotateCcw className="h-7 w-7" />
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
