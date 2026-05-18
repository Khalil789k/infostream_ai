import * as THREE from 'three';

export type BoneRotations = Record<string, { x: number; y: number; z: number }>;

export type PoseOffsets = {
  rightArmX: number;
  rightArmZ: number;
  rightForeArmX: number;
  leftArmZ?: number;
  fingers: BoneRotations;
};

// Helper to curl fingers
const curlFist = (): BoneRotations => ({
  RightHandIndex1: { x: 1.5, y: 0, z: 0 },
  RightHandMiddle1: { x: 1.5, y: 0, z: 0 },
  RightHandRing1: { x: 1.5, y: 0, z: 0 },
  RightHandPinky1: { x: 1.5, y: 0, z: 0 },
  RightHandThumb1: { x: 1.2, y: 0, z: 0.8 },
});

// Helper for open hand
const openHand = (): BoneRotations => ({
  RightHandIndex1: { x: 0, y: 0, z: 0 },
  RightHandMiddle1: { x: 0, y: 0, z: 0 },
  RightHandRing1: { x: 0, y: 0, z: 0 },
  RightHandPinky1: { x: 0, y: 0, z: 0 },
  RightHandThumb1: { x: 0, y: -0.5, z: 0 },
});

export const ALPHABET_MAP: Record<string, BoneRotations> = {
  "A": { ...curlFist(), RightHandThumb1: { x: 0, y: -0.5, z: 0 } },
  "B": { ...openHand(), RightHandThumb1: { x: 1.2, y: 0, z: 0.8 } },
  "C": {
    RightHandIndex1: { x: 0.8, y: 0, z: 0 },
    RightHandMiddle1: { x: 0.8, y: 0, z: 0 },
    RightHandRing1: { x: 0.8, y: 0, z: 0 },
    RightHandPinky1: { x: 0.8, y: 0, z: 0 },
    RightHandThumb1: { x: 0.8, y: 0, z: 0.5 },
  },
  "D": { ...curlFist(), RightHandIndex1: { x: 0, y: 0, z: 0 }, RightHandThumb1: { x: 1.1, y: 0, z: 0.4 } },
  "E": {
    RightHandIndex1: { x: 1.4, y: 0, z: 0 },
    RightHandMiddle1: { x: 1.4, y: 0, z: 0 },
    RightHandRing1: { x: 1.4, y: 0, z: 0 },
    RightHandPinky1: { x: 1.4, y: 0, z: 0 },
    RightHandThumb1: { x: 1.5, y: 0, z: 0 },
  },
  "F": {
    ...openHand(),
    RightHandIndex1: { x: 1.5, y: 0, z: 0.5 },
    RightHandThumb1: { x: 0.2, y: 0.5, z: 0.2 },
  },
  "G": { ...curlFist(), RightHandIndex1: { x: 0, y: 1.5, z: 0 }, RightHandThumb1: { x: 0, y: 1.5, z: 0 } },
  "H": { ...curlFist(), RightHandIndex1: { x: 0, y: 1.5, z: 0 }, RightHandMiddle1: { x: 0, y: 1.5, z: 0 } },
  "I": { ...curlFist(), RightHandPinky1: { x: 0, y: 0, z: 0 } },
  "J": { ...curlFist(), RightHandPinky1: { x: 0, y: 0, z: 0 } }, // Needs movement in resolvePose
  "K": { ...curlFist(), RightHandIndex1: { x: 0, y: 0.2, z: 0 }, RightHandMiddle1: { x: 0, y: 0.2, z: 0.2 }, RightHandThumb1: { x: 0.2, y: 0.3, z: 0.1 } },
  "L": { ...curlFist(), RightHandIndex1: { x: 0, y: 0, z: 0 }, RightHandThumb1: { x: 0, y: -1.5, z: 0 } },
  "M": {
    RightHandIndex1: { x: 1.5, y: 0, z: 0 },
    RightHandMiddle1: { x: 1.5, y: 0, z: 0 },
    RightHandRing1: { x: 1.5, y: 0, z: 0 },
    RightHandPinky1: { x: 1.5, y: 0, z: 0 },
    RightHandThumb1: { x: 0, y: 0.5, z: 1.5 }, // Thumb tucked under 3 fingers
  },
  "N": {
    RightHandIndex1: { x: 1.5, y: 0, z: 0 },
    RightHandMiddle1: { x: 1.5, y: 0, z: 0 },
    RightHandRing1: { x: 1.5, y: 0, z: 0 },
    RightHandPinky1: { x: 1.5, y: 0, z: 0 },
    RightHandThumb1: { x: 0, y: 0.3, z: 1.0 }, // Thumb tucked under 2 fingers
  },
  "O": {
    RightHandIndex1: { x: 1.2, y: 0, z: 0 },
    RightHandMiddle1: { x: 1.2, y: 0, z: 0 },
    RightHandRing1: { x: 1.2, y: 0, z: 0 },
    RightHandPinky1: { x: 1.2, y: 0, z: 0 },
    RightHandThumb1: { x: 1.2, y: 0, z: 0.5 },
  },
  "P": { ...curlFist(), RightHandIndex1: { x: 0, y: 0, z: 0 }, RightHandMiddle1: { x: 0.8, y: 0, z: 0 }, RightHandThumb1: { x: 0.8, y: 0, z: 0.5 } }, // Similar to K but downwards in resolvePose
  "Q": { ...curlFist(), RightHandIndex1: { x: 0.8, y: 0, z: 0 }, RightHandThumb1: { x: 0.8, y: 0, z: 0.5 } }, // Pointing down
  "R": { ...curlFist(), RightHandIndex1: { x: 0, y: 0.2, z: 0.2 }, RightHandMiddle1: { x: 0, y: -0.2, z: -0.2 } }, // Crossed
  "S": { ...curlFist(), RightHandThumb1: { x: 1.5, y: 0, z: 0 } }, // Thumb over fingers
  "T": { ...curlFist(), RightHandIndex1: { x: 1.5, y: 0, z: 0 }, RightHandThumb1: { x: 0, y: 0.2, z: 0.5 } }, // Thumb between index and middle
  "U": { ...curlFist(), RightHandIndex1: { x: 0, y: 0, z: 0 }, RightHandMiddle1: { x: 0, y: 0, z: 0 } }, // Fingers together
  "V": { ...curlFist(), RightHandIndex1: { x: 0, y: 0.2, z: 0 }, RightHandMiddle1: { x: 0, y: -0.2, z: 0 } }, // Fingers apart
  "W": { ...curlFist(), RightHandIndex1: { x: 0, y: 0.3, z: 0 }, RightHandMiddle1: { x: 0, y: 0, z: 0 }, RightHandRing1: { x: 0, y: -0.3, z: 0 } },
  "X": { ...curlFist(), RightHandIndex1: { x: 1.0, y: 0, z: 0 } }, // Hooked index
  "Y": { ...curlFist(), RightHandPinky1: { x: 0, y: 0, z: 0 }, RightHandThumb1: { x: 0, y: -1.0, z: 0 } },
  "Z": { ...curlFist(), RightHandIndex1: { x: 0, y: 0, z: 0 } }, // Drawing Z in resolvePose
};

export function resolvePose(animationName: string, progress: number, elapsed: number): PoseOffsets {
  const letter = animationName.replace("Letter_", "");
  const fingerPose = ALPHABET_MAP[letter] || openHand();
  
  // Default Stance: Arms Down (Resting position)
  const pose: PoseOffsets = {
    rightArmX: 0,        // Down at side
    rightArmZ: 1.2,      // Drop right arm
    rightForeArmX: 0.1,  // Almost straight
    leftArmZ: -1.2,      // Drop left arm
    fingers: openHand()  // Relaxed hand
  };

  if (animationName.startsWith("Letter_") && animationName !== "Idle") {
    // Raise arm for signing (chest level)
    pose.rightArmX = 1.2;
    pose.rightArmZ = 0.3; // Bring slightly to front
    pose.rightForeArmX = 1.5;
    pose.fingers = fingerPose;

    // Height & Angle adjustments based on PSL video observation
    if (["P", "Q", "G", "H"].includes(letter)) {
      pose.rightArmX = 0.8; 
      pose.rightForeArmX = 1.0;
    }
    
    if (["B", "L", "U", "V", "W"].includes(letter)) {
      pose.rightArmX = 1.4; 
      pose.rightForeArmX = 1.6;
    }

    // Dynamic Movements for J and Z
    if (letter === "J") {
      const swoop = Math.sin(progress * Math.PI);
      pose.rightArmZ = 0.3 - swoop * 0.6;
      pose.rightForeArmX = 1.5 - swoop * 0.4;
    }
    
    if (letter === "Z") {
      const zProgress = progress * Math.PI;
      pose.rightArmZ = 0.3 + Math.cos(zProgress) * 0.4;
      pose.rightArmX = 1.2 + Math.sin(zProgress) * 0.3;
    }
  }

  return pose;
}
