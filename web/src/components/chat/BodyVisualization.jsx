import React, { Suspense, useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, OrbitControls } from "@react-three/drei";
import { X, RotateCw, ZoomIn, ZoomOut, RotateCcw, Info, Shield, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as THREE from "three";

// -------------------------------------------------------------
// WebGL Availability Check
// -------------------------------------------------------------
function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

// -------------------------------------------------------------
// Doctor Model Loader Component
// -------------------------------------------------------------
function DoctorModelWrapper({ url, isTalking, currentAnimation, isMobile }) {
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, scene);
  const modelRef = useRef();

  useEffect(() => {
    if (actions && actions["Idle"]) {
      actions["Idle"].play();
    }
    return () => {
      if (actions && actions["Idle"]) {
        actions["Idle"].stop();
      }
    };
  }, [actions]);

  useEffect(() => {
    if (actions && actions["TalkingOne"]) {
      if (isTalking) {
        actions["TalkingOne"].reset().fadeIn(0.3).play();
      } else {
        actions["TalkingOne"].fadeOut(0.3);
      }
    }
  }, [isTalking, actions]);

  // Gentle breathing idle animation
  useFrame((state) => {
    if (modelRef.current) {
      // Idle breathing
      modelRef.current.position.y = -0.9 + Math.sin(state.clock.elapsedTime * 0.8) * 0.008;
      modelRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.04;
    }
  });

  // Adjust doctor placement (waist up, fills left panel)
  const position = isMobile ? [-0.65, 0.75, 0.2] : [-1.2, -0.9, 0];
  const scale = isMobile ? 0.35 : 0.95;

  return <primitive ref={modelRef} object={scene} scale={scale} position={position} />;
}

// -------------------------------------------------------------
// Redesigned Stylized Body Silhouette (From Primitives)
// -------------------------------------------------------------
function BodySilhouetteMesh({ isMobile, onPartHover, activeMethod }) {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      // Slow rotation for visual interest
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.02;
    }
  });

  const position = isMobile ? [0, -0.4, 0] : [0.4, -0.2, 0];
  const scale = isMobile ? 0.75 : 1.0;

  // Hover handlers
  const handleOver = (e, partName, desc) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
    onPartHover({
      title: partName,
      desc: desc,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleOut = () => {
    document.body.style.cursor = "default";
    onPartHover(null);
  };

  // Tooltip descriptions based on active method
  const getDesc = (part) => {
    if (part === "head") {
      return "Hypothalamus: Oral hormones signal the brain to pause egg maturation and prevent ovulation.";
    }
    if (part === "arm") {
      return "Upper Arm: Site of subdermal implants or injections which release hormones continuously.";
    }
    if (part === "pelvis") {
      return "Pelvis: Holds the reproductive system. The site of uterus/ovary protection by barrier or hormonal actions.";
    }
    return "";
  };

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Head: Sphere r=0.18 */}
      <mesh 
        position={[0, 0.58, 0]}
        onPointerOver={(e) => handleOver(e, "Brain (Hypothalamus)", getDesc("head"))}
        onPointerOut={handleOut}
      >
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshPhongMaterial
          color={0x1a3a4a}
          transparent
          opacity={0.4}
          emissive={0x0E7A80}
          emissiveIntensity={0.1}
          shininess={50}
        />
      </mesh>

      {/* Torso: Cylinder top=0.28, bottom=0.22, height=0.6 */}
      <mesh 
        position={[0, 0.1, 0]}
        onPointerOver={(e) => handleOver(e, "Torso", "The central pathway for systemic hormone circulation.")}
        onPointerOut={handleOut}
      >
        <cylinderGeometry args={[0.28, 0.22, 0.6, 16]} />
        <meshPhongMaterial
          color={0x1a3a4a}
          transparent
          opacity={0.4}
          emissive={0x0E7A80}
          emissiveIntensity={0.1}
          shininess={50}
        />
      </mesh>

      {/* Pelvis: Sphere r=0.2 flattened on Y */}
      <mesh 
        position={[0, -0.28, 0]} 
        scale={[1.1, 0.7, 0.9]}
        onPointerOver={(e) => handleOver(e, "Reproductive Cavity", getDesc("pelvis"))}
        onPointerOut={handleOut}
      >
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshPhongMaterial
          color={0x1a3a4a}
          transparent
          opacity={0.4}
          emissive={0x0E7A80}
          emissiveIntensity={0.1}
          shininess={50}
        />
      </mesh>

      {/* Left Upper Arm: Cylinder r=0.07 height=0.35, rotated */}
      <mesh 
        position={[-0.36, 0.28, 0]} 
        rotation={[0, 0, Math.PI / 12]}
        onPointerOver={(e) => handleOver(e, "Upper Arm", getDesc("arm"))}
        onPointerOut={handleOut}
      >
        <cylinderGeometry args={[0.07, 0.07, 0.35, 12]} />
        <meshPhongMaterial
          color={0x1a3a4a}
          transparent
          opacity={0.4}
          emissive={0x0E7A80}
          emissiveIntensity={0.1}
          shininess={30}
        />
      </mesh>

      {/* Left Lower Arm: Cylinder r=0.06 height=0.32 */}
      <mesh position={[-0.41, 0.01, 0]} rotation={[0, 0, Math.PI / 16]}>
        <cylinderGeometry args={[0.06, 0.06, 0.32, 12]} />
        <meshPhongMaterial
          color={0x1a3a4a}
          transparent
          opacity={0.4}
          emissive={0x0E7A80}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Right Upper Arm: Cylinder r=0.07 height=0.35, rotated */}
      <mesh position={[0.36, 0.28, 0]} rotation={[0, 0, -Math.PI / 12]}>
        <cylinderGeometry args={[0.07, 0.07, 0.35, 12]} />
        <meshPhongMaterial
          color={0x1a3a4a}
          transparent
          opacity={0.4}
          emissive={0x0E7A80}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Right Lower Arm */}
      <mesh position={[0.41, 0.01, 0]} rotation={[0, 0, -Math.PI / 16]}>
        <cylinderGeometry args={[0.06, 0.06, 0.32, 12]} />
        <meshPhongMaterial
          color={0x1a3a4a}
          transparent
          opacity={0.4}
          emissive={0x0E7A80}
          emissiveIntensity={0.1}
        />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// Visual overlay scenes
// -------------------------------------------------------------

function ImplantRedesignScene({ step, isMobile }) {
  const [particles] = useState(() => {
    const arr = [];
    for (let i = 0; i < 35; i++) {
      arr.push({
        t: Math.random(),
        speed: 0.005 + Math.random() * 0.007,
        offset: new THREE.Vector3((Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.03)
      });
    }
    return arr;
  });

  const pRefs = useRef([]);
  const basePos = isMobile ? [0, -0.4, 0] : [0.4, -0.2, 0];
  const baseScale = isMobile ? 0.75 : 1.0;

  useFrame(() => {
    if (step < 1) return;
    particles.forEach((p, idx) => {
      p.t += p.speed;
      if (p.t > 1) p.t = 0;
      const ref = pRefs.current[idx];
      if (ref) {
        // Path from left upper arm [-0.36, 0.28, 0.02] to ovaries [0.12, -0.28, 0.02] / [-0.12, -0.28, 0.02]
        const targetX = idx % 2 === 0 ? 0.12 : -0.12;
        const targetY = -0.28;
        const targetZ = 0.02;

        const startX = -0.36;
        const startY = 0.28;
        const startZ = 0.02;

        const tx = THREE.MathUtils.lerp(startX, targetX, p.t);
        const ty = THREE.MathUtils.lerp(startY, targetY, p.t) - Math.sin(p.t * Math.PI) * 0.1;
        const tz = THREE.MathUtils.lerp(startZ, targetZ, p.t);

        ref.position.set(tx + p.offset.x, ty + p.offset.y, tz + p.offset.z);
      }
    });
  });

  return (
    <group position={basePos} scale={baseScale}>
      {/* Implant: Cylinder (r=0.015, height=0.12) colored Purple (0x5C3C7A) in left upper arm */}
      <mesh position={[-0.36, 0.28, 0.02]} rotation={[0, 0, Math.PI / 12]}>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
        <meshStandardMaterial color={0x5C3C7A} emissive={0x5C3C7A} emissiveIntensity={2} />
      </mesh>

      {/* Pulsing PointLight */}
      <pointLight 
        position={[-0.36, 0.28, 0.05]} 
        color="#5C3C7A" 
        intensity={step >= 1 ? 1.5 + Math.sin(Date.now() * 0.005) * 0.5 : 0.4} 
        distance={0.8}
      />

      {/* Ovaries */}
      <mesh position={[0.12, -0.28, 0]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial
          color={step >= 2 ? "#1E293B" : "#EC4899"}
          emissive={step >= 2 ? "#000" : "#EC4899"}
          emissiveIntensity={step >= 2 ? 0 : 1.2}
        />
      </mesh>
      <mesh position={[-0.12, -0.28, 0]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial
          color={step >= 2 ? "#1E293B" : "#EC4899"}
          emissive={step >= 2 ? "#000" : "#EC4899"}
          emissiveIntensity={step >= 2 ? 0 : 1.2}
        />
      </mesh>

      {/* Sub-scene Particles */}
      {step >= 1 &&
        particles.map((p, idx) => (
          <mesh key={idx} ref={(el) => (pRefs.current[idx] = el)}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color="#A855F7" emissive="#A855F7" emissiveIntensity={1.5} />
          </mesh>
        ))}
    </group>
  );
}

function CopperIudRedesignScene({ step, isMobile }) {
  const [sperm] = useState(() => {
    const arr = [];
    for (let i = 0; i < 30; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 0.06,
        y: -0.5 - Math.random() * 0.08,
        speed: 0.002 + Math.random() * 0.003,
        wiggleSpeed: 5 + Math.random() * 6,
        wiggleAmp: 0.005,
        phase: Math.random() * Math.PI * 2,
        active: true
      });
    }
    return arr;
  });

  const sRefs = useRef([]);
  const basePos = isMobile ? [0, -0.4, 0] : [0.4, -0.2, 0];
  const baseScale = isMobile ? 0.75 : 1.0;

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    sperm.forEach((s, idx) => {
      const ref = sRefs.current[idx];
      if (!ref) return;

      if (step === 0) {
        ref.position.set(s.x, s.y, 0.05);
        return;
      }

      if (s.active) {
        s.y += s.speed;
        const wx = s.x + Math.sin(elapsed * s.wiggleSpeed + s.phase) * s.wiggleAmp;
        ref.position.set(wx, s.y, 0.05);

        // Distance from IUD center [0, -0.28, 0.02]
        const dist = Math.sqrt(wx * wx + (s.y - (-0.28)) * (s.y - (-0.28)));
        if (dist < 0.15 && step >= 1) {
          s.active = false;
        }

        if (s.y > -0.1) {
          s.y = -0.5;
          s.active = true;
        }
      } else {
        // Fading deactivated sperm
        ref.scale.multiplyScalar(0.95);
        if (ref.scale.x < 0.1) {
          s.y = -0.5;
          s.active = true;
          ref.scale.set(1, 1, 1);
        }
      }
    });
  });

  return (
    <group position={basePos} scale={baseScale}>
      {/* Extruded/Lathed Uterus Mesh in Pelvis */}
      <mesh position={[0, -0.28, 0.01]}>
        <coneGeometry args={[0.15, 0.28, 4]} />
        <meshBasicMaterial color="#EC4899" wireframe transparent opacity={0.25} />
      </mesh>

      {/* Copper T cylinders (color copper: 0xB87333) */}
      <group position={[0, -0.26, 0.02]}>
        {/* Stem */}
        <mesh position={[0, -0.04, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.1, 8]} />
          <meshStandardMaterial color={0xB87333} metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Arm */}
        <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.1, 8]} />
          <meshStandardMaterial color={0xB87333} metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Sperm Particles */}
      {step >= 1 &&
        sperm.map((s, idx) => (
          <mesh key={idx} ref={(el) => (sRefs.current[idx] = el)}>
            <sphereGeometry args={[0.006, 6, 6]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.6} />
          </mesh>
        ))}
    </group>
  );
}

function CocRedesignScene({ step, isMobile }) {
  const [particles] = useState(() => {
    const arr = [];
    for (let i = 0; i < 30; i++) {
      arr.push({
        t: Math.random(),
        speed: 0.006 + Math.random() * 0.006
      });
    }
    return arr;
  });

  const pRefs = useRef([]);
  const basePos = isMobile ? [0, -0.4, 0] : [0.4, -0.2, 0];
  const baseScale = isMobile ? 0.75 : 1.0;

  useFrame(() => {
    if (step < 1) return;
    particles.forEach((p, idx) => {
      const ref = pRefs.current[idx];
      if (!ref) return;

      p.t += p.speed;
      if (p.t > 1) p.t = 0;

      // Pathway: Stomach [0, 0.1, 0.02] -> Brain/Hypothalamus [0, 0.58, 0.02] -> Ovaries [0.12, -0.28, 0.02]
      let tx, ty, tz;
      if (p.t < 0.5) {
        // First half: Stomach to Head
        const progress = p.t * 2;
        tx = 0;
        ty = THREE.MathUtils.lerp(0.1, 0.58, progress);
        tz = 0.02;
      } else {
        // Second half: Head to Ovaries
        const progress = (p.t - 0.5) * 2;
        const targetX = idx % 2 === 0 ? 0.12 : -0.12;
        tx = THREE.MathUtils.lerp(0, targetX, progress);
        ty = THREE.MathUtils.lerp(0.58, -0.28, progress);
        tz = 0.02;
      }

      ref.position.set(tx, ty, tz);
    });
  });

  return (
    <group position={basePos} scale={baseScale}>
      {/* Brain Pituitary Sphere (purple: 0x5C3C7A, pulsing) */}
      <mesh position={[0, 0.58, 0.02]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial
          color={0x5C3C7A}
          emissive={0x5C3C7A}
          emissiveIntensity={1.5 + Math.sin(Date.now() * 0.006) * 0.5}
        />
      </mesh>

      {/* Stomach marker */}
      <mesh position={[0, 0.1, 0.02]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#10B981" transparent opacity={0.3} wireframe />
      </mesh>

      {/* Ovaries */}
      <mesh position={[0.12, -0.28, 0]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial
          color={step >= 2 ? "#1E293B" : "#EC4899"}
          emissive={step >= 2 ? "#000" : "#EC4899"}
          emissiveIntensity={step >= 2 ? 0 : 1.2}
        />
      </mesh>
      <mesh position={[-0.12, -0.28, 0]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial
          color={step >= 2 ? "#1E293B" : "#EC4899"}
          emissive={step >= 2 ? "#000" : "#EC4899"}
          emissiveIntensity={step >= 2 ? 0 : 1.2}
        />
      </mesh>

      {/* Cervix mucus disc (slightly opaque disc) */}
      {step >= 2 && (
        <mesh position={[0, -0.4, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.01, 16]} />
          <meshPhongMaterial color="#0E7A80" transparent opacity={0.8} shininess={80} />
        </mesh>
      )}

      {/* Traveling Particles */}
      {step >= 1 &&
        particles.map((p, idx) => (
          <mesh key={idx} ref={(el) => (pRefs.current[idx] = el)}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color="#4DD6DC" emissive="#4DD6DC" emissiveIntensity={1.5} />
          </mesh>
        ))}
    </group>
  );
}

// -------------------------------------------------------------
// Narration dictionary definitions
// -------------------------------------------------------------
const METHOD_DETAILS = {
  implant: {
    title: "Implant",
    steps: [
      {
        title: "Arm Placement",
        text: "The implant is a tiny, flexible rod placed under the skin of your inner upper arm by a healthcare provider. It is quick and virtually painless.",
        animation: "TalkingOne"
      },
      {
        title: "Hormone Release",
        text: "Once in place, the implant continuously releases a very low dose of the hormone progestin into your body over 3 to 5 years.",
        animation: "TalkingOne"
      },
      {
        title: "Double Action Protection",
        text: "This hormone stops your ovaries from releasing eggs, and it thickens the mucus in your cervix so sperm cannot enter to reach an egg.",
        animation: "ThumbsUp"
      }
    ]
  },
  iud_copper: {
    title: "Copper IUD",
    steps: [
      {
        title: "Uterine Placement",
        text: "A T-shaped copper device is inserted inside your uterus by a healthcare provider. It can prevent pregnancy for up to 10 years.",
        animation: "TalkingOne"
      },
      {
        title: "Spermicidal Environment",
        text: "The copper wire wrapped around the device releases copper ions, creating a natural copper barrier that is highly toxic to sperm.",
        animation: "TalkingOne"
      },
      {
        title: "Sperm Immobilization",
        text: "Sperm entering the uterus are deactivated, losing their ability to swim and fertilize an egg. It operates 100% hormone-free.",
        animation: "ThumbsUp"
      }
    ]
  },
  iud_lng: {
    title: "Hormonal IUD (LNG)",
    steps: [
      {
        title: "Uterine Placement",
        text: "A T-shaped hormonal device is inserted inside your uterus by a healthcare provider. It prevents pregnancy for 3 to 5 years.",
        animation: "TalkingOne"
      },
      {
        title: "Hormone Release",
        text: "It slowly releases progestin directly inside the uterus, keeping the hormone local to your reproductive system.",
        animation: "TalkingOne"
      },
      {
        title: "Mucus Barrier & Thinning",
        text: "It thickens cervical mucus to block sperm and thins the uterine lining, which often reduces period pain and makes bleeding much lighter.",
        animation: "ThumbsUp"
      }
    ]
  },
  coc: {
    title: "Combined Pill (COC)",
    steps: [
      {
        title: "Daily Oral Routine",
        text: "You take one pill daily at the same time. The pill contains two hormones, estrogen and progestin, which mimic your natural cycle.",
        animation: "TalkingOne"
      },
      {
        title: "Brain-Ovary Axis Suppression",
        text: "The hormones travel via blood to your pituitary gland in the brain, signaling it to pause egg development in your ovaries.",
        animation: "TalkingOne"
      },
      {
        title: "No Ovulation",
        text: "Because egg release is stopped, fertilization cannot happen. The pill also thickens cervical mucus to add an extra layer of protection.",
        animation: "ThumbsUp"
      }
    ]
  },
  pop: {
    title: "Mini-Pill (POP)",
    steps: [
      {
        title: "Progestin-Only Barrier",
        text: "Unlike the combined pill, the mini-pill contains only progestin. Its primary job is to thicken the cervical mucus to block sperm.",
        animation: "TalkingOne"
      },
      {
        title: "Partial Ovulation Control",
        text: "It may also stop your ovaries from releasing eggs, but its main, highly effective defense is the mucus plug at the cervix entrance.",
        animation: "TalkingOne"
      },
      {
        title: "The 3-Hour Window",
        text: "You must take this pill within the exact same 3-hour window every day. Being late weakens the mucus barrier, allowing sperm to cross.",
        animation: "Wave"
      }
    ]
  },
  injectable: {
    title: "Injectable (DMPA)",
    steps: [
      {
        title: "Intramuscular Injection",
        text: "A healthcare provider administers the injection into your upper arm muscle or buttock every 12 to 13 weeks (about 3 months).",
        animation: "TalkingOne"
      },
      {
        title: "Slow-Release Depot",
        text: "The fluid forms a small reservoir (depot) in your muscle, slowly releasing progestin into your body over the next 90 days.",
        animation: "TalkingOne"
      },
      {
        title: "Suppressed Ovulation",
        text: "The steady hormone levels stop the brain from signaling egg release, pausing ovulation completely while the depot remains active.",
        animation: "ThumbsUp"
      }
    ]
  },
  condom: {
    title: "Male Condom",
    steps: [
      {
        title: "Physical Sheath Barrier",
        text: "The condom is rolled onto the erect penis before sex, acting as a direct physical barrier that blocks body fluids from mixing.",
        animation: "TalkingOne"
      },
      {
        title: "Dual Protection",
        text: "It blocks sperm (preventing pregnancy) and blocks bacteria/viruses (preventing STIs). It is the only method that offers dual protection.",
        animation: "ThumbsUp"
      },
      {
        title: "Correct Use is Critical",
        text: "Always check the expiration date, open carefully, leave room at the tip, and use a new condom for every single sexual act.",
        animation: "TalkingOne"
      }
    ]
  },
  emergency: {
    title: "Emergency Pill (EC)",
    steps: [
      {
        title: "Delaying Ovulation",
        text: "Emergency pills contain a high dose of hormones that delay or stop an egg from being released from your ovary.",
        animation: "TalkingOne"
      },
      {
        title: "The 72-Hour Window",
        text: "It is most effective when taken as soon as possible after unprotected sex—ideally within 24 hours, and up to 72 hours.",
        animation: "TalkingOne"
      },
      {
        title: "Prevention, Not Reversal",
        text: "EC works by delaying egg release. If ovulation has already happened, the pill cannot prevent pregnancy. It is not an abortion pill.",
        animation: "Wave"
      }
    ]
  }
};

// -------------------------------------------------------------
// Fallback UI
// -------------------------------------------------------------
function StaticExplainerFallback({ method, onClose, availableMethods, onSwitchMethod }) {
  const details = METHOD_DETAILS[method] || METHOD_DETAILS.implant;
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="fixed inset-0 z-50 bg-[#0D1B2A] text-white flex flex-col p-6 font-sans overflow-y-auto">
      <div className="flex justify-between items-center border-b border-teal-900 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-teal-400" />
          <h2 className="text-xl font-bold text-teal-400">{details.title} Action Explainer</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-teal-400 hover:text-white">
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col justify-center gap-6 py-4">
        <div className="bg-[#111F2E] border border-teal-900/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <Badge variant="secondary" className="bg-[#0E7A80]/15 text-[#4DD6DC] border border-[#0E7A80]/30">
              Step {activeStep + 1} of {details.steps.length}
            </Badge>
          </div>

          <h3 className="text-lg font-semibold text-teal-300 mt-2 mb-4">
            {details.steps[activeStep].title}
          </h3>
          <p className="text-gray-200 leading-relaxed text-sm md:text-base">
            {details.steps[activeStep].text}
          </p>
        </div>
      </div>

      {/* Switcher & controls at the bottom */}
      <div className="mt-auto max-w-2xl mx-auto w-full flex flex-col gap-4 py-4 border-t border-teal-900/40">
        {/* Method switcher */}
        {availableMethods && (
          <div className="flex justify-center gap-2">
            {availableMethods.map((m) => (
              <button
                key={m}
                onClick={() => {
                  onSwitchMethod(m);
                  setActiveStep(0);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  m === method 
                    ? "bg-[#0E7A80] border-[#0E7A80] text-white" 
                    : "bg-[#111F2E] border-teal-900/50 text-[#7A9BA8] hover:text-white"
                }`}
              >
                {METHOD_DETAILS[m]?.title || m}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center gap-4">
          <Button
            variant="outline"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((prev) => prev - 1)}
            className="border-teal-900 text-teal-400 hover:bg-teal-950"
          >
            Back
          </Button>
          <div className="flex gap-2">
            {details.steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  idx === activeStep ? "bg-teal-400 w-5" : "bg-teal-950"
                }`}
              />
            ))}
          </div>
          {activeStep < details.steps.length - 1 ? (
            <Button
              onClick={() => setActiveStep((prev) => prev + 1)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Next
            </Button>
          ) : (
            <Button onClick={onClose} className="bg-teal-600 hover:bg-teal-700 text-white">
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Main Redesigned Body Visualization Overlay Component
// -------------------------------------------------------------
export default function BodyVisualization({ method: initialMethod, doctorId, onClose, recommendations }) {
  const [method, setMethod] = useState(initialMethod);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Doctor avatar state syncs
  const [isTalking, setIsTalking] = useState(false);
  const [doctorAnim, setDoctorAnim] = useState("Idle");

  // Typewriter effect state
  const [displayedText, setDisplayedText] = useState("");

  // Controls
  const [cameraZoom, setCameraZoom] = useState(2.2);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Tooltip
  const [hoveredPart, setHoveredPart] = useState(null);

  const doctorUrl = doctorId === "amara" ? "/avatars/doctor-female.glb" : "/avatars/doctor-male.glb";
  const doctorName = doctorId === "amara" ? "Amara" : "Kofi";
  const details = METHOD_DETAILS[method] || METHOD_DETAILS.implant;

  // Get recommended methods list for switcher
  const availableMethods = recommendations?.recommendations?.map((r) => r.method) || ["implant", "iud_copper", "coc"];

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setWebGLSupported(false);
    }
    const checkSize = () => setIsMobile(window.innerWidth < 768);
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // Sync Typewriter and Doctor Animation with Step changes
  useEffect(() => {
    const fullText = details.steps[activeStep]?.text || "";
    setDisplayedText("");
    
    // Set matching animation pose
    setDoctorAnim(details.steps[activeStep]?.animation || "Idle");
    setIsTalking(true);

    let idx = 0;
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + fullText.charAt(idx));
      idx++;
      if (idx >= fullText.length) {
        clearInterval(interval);
        setIsTalking(false);
      }
    }, 30); // 30ms per character

    return () => {
      clearInterval(interval);
      setIsTalking(false);
    };
  }, [activeStep, method, details]);

  if (!webGLSupported) {
    return (
      <StaticExplainerFallback 
        method={method} 
        onClose={onClose} 
        availableMethods={availableMethods} 
        onSwitchMethod={setMethod} 
      />
    );
  }

  // Camera limits & dynamic zoom
  const currentCameraZ = cameraZoom;

  return (
    <div className="fixed inset-0 z-50 bg-[#0D1B2A] text-white flex flex-col overflow-hidden font-sans">
      
      {/* Background radial gradient glow behind the body */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{
          background: "radial-gradient(circle at 60% 50%, rgba(14,122,128,0.14) 0%, #0D1B2A 70%)"
        }}
      />

      {/* Main Canvas view */}
      <div className="relative flex-1 h-full w-full z-10">
        <Suspense
          fallback={
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D1B2A] text-white z-50">
              <span className="h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-teal-400 font-semibold">Configuring 3D Scene...</p>
            </div>
          }
        >
          <Canvas
            key={resetKey}
            camera={{ position: [0, 0.2, currentCameraZ], fov: 38 }}
            style={{ background: "transparent", width: "100%", height: "100%" }}
            gl={{ alpha: true, antialias: true }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[1, 3, 2]} intensity={1.0} color="#ffffff" />
            
            {/* Primary teal lighting */}
            <pointLight position={[-1, 1, 1]} intensity={0.8} color="#0E7A80" />
            {/* Secondary pulsing purple rim light */}
            <pointLight 
              position={[1, -1, 2]} 
              intensity={isTalking ? 0.7 + Math.sin(Date.now() * 0.005) * 0.3 : 0.3} 
              color="#5C3C7A" 
            />

            {/* Doctor Model on the left 25% */}
            <DoctorModelWrapper
              url={doctorUrl}
              isTalking={isTalking}
              currentAnimation={doctorAnim}
              isMobile={isMobile}
            />

            {/* Redesigned body silhouette on the right 75% */}
            <BodySilhouetteMesh 
              isMobile={isMobile} 
              onPartHover={setHoveredPart} 
              activeMethod={method} 
            />

            {/* Interactive Scene Overlays */}
            {method === "implant" && <ImplantRedesignScene step={activeStep} isMobile={isMobile} />}
            {(method === "iud_copper" || method === "iud_lng") && (
              <CopperIudRedesignScene step={activeStep} isMobile={isMobile} />
            )}
            {method === "coc" && <CocRedesignScene step={activeStep} isMobile={isMobile} />}
            
            {/* Fallbacks for other methods */}
            {method === "pop" && <ImplantRedesignScene step={activeStep} isMobile={isMobile} />}
            {method === "injectable" && <ImplantRedesignScene step={activeStep} isMobile={isMobile} />}
            {method === "condom" && <CopperIudRedesignScene step={activeStep} isMobile={isMobile} />}
            {method === "emergency" && <CocRedesignScene step={activeStep} isMobile={isMobile} />}

            {/* Orbit controls with locked vertical flipping */}
            <OrbitControls 
              enableZoom={false}
              autoRotate={autoRotate}
              autoRotateSpeed={1.5}
              minPolarAngle={Math.PI / 2 - 0.1}
              maxPolarAngle={Math.PI / 2 + 0.1}
            />
          </Canvas>
        </Suspense>

        {/* -------------------------------------------------------------
            HTML Interface Overlays
            ------------------------------------------------------------- */}

        {/* 1. Header & Close Button */}
        <div className="absolute top-0 inset-x-0 p-5 bg-gradient-to-b from-[#0D1B2A] to-transparent flex justify-between items-start z-40 pointer-events-auto">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {details.title} Explainer
            </h2>
            <p className="text-xs text-[#7A9BA8] font-medium uppercase tracking-wider">3D Anatomical Mode</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="text-teal-400 hover:text-white rounded-full bg-[#111F2E]/60 border border-teal-900/30 w-10 h-10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 2. Top-Right Camera Controls Panel */}
        <div className="absolute top-20 right-5 z-40 flex flex-col gap-2 pointer-events-auto bg-[#111F2E]/90 border border-teal-900/40 rounded-xl p-2.5 backdrop-blur-md">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-[#7A9BA8] hover:text-white"
            onClick={() => setCameraZoom((z) => Math.max(1.5, z - 0.2))}
            title="Zoom In"
          >
            <ZoomIn className="h-4.5 w-4.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-[#7A9BA8] hover:text-white"
            onClick={() => setCameraZoom((z) => Math.min(3.2, z + 0.2))}
            title="Zoom Out"
          >
            <ZoomOut className="h-4.5 w-4.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={`h-8 w-8 ${autoRotate ? "text-teal-400" : "text-[#7A9BA8]"} hover:text-white`}
            onClick={() => setAutoRotate(!autoRotate)}
            title="Auto Rotate"
          >
            <RotateCw className="h-4.5 w-4.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-[#7A9BA8] hover:text-white border-t border-teal-900/20 mt-1 pt-1"
            onClick={() => {
              setCameraZoom(2.2);
              setAutoRotate(false);
              setResetKey((k) => k + 1);
            }}
            title="Reset View"
          >
            <RotateCcw className="h-4.5 w-4.5" />
          </Button>
        </div>

        {/* 3. Hover Raycaster Tooltip Display */}
        {hoveredPart && (
          <div 
            className="absolute z-50 bg-[#111F2E] border border-teal-900/50 rounded-xl p-3.5 shadow-2xl max-w-xs pointer-events-none animate-slide-down backdrop-blur-md"
            style={{
              left: `${hoveredPart.x + 15}px`,
              top: `${hoveredPart.y - 45}px`,
            }}
          >
            <h4 className="text-xs font-bold text-teal-400 mb-1 flex items-center gap-1.5 uppercase tracking-wide">
              <Eye className="h-3.5 w-3.5" /> {hoveredPart.title}
            </h4>
            <p className="text-[11px] text-gray-200 leading-relaxed font-normal">
              {hoveredPart.desc}
            </p>
          </div>
        )}

        {/* 4. Bottom Narration and Navigation Panel */}
        <div className="absolute bottom-6 inset-x-0 px-4 md:px-10 z-40 pointer-events-none">
          <div className="max-w-4xl mx-auto w-full bg-[#111F2E]/95 border border-teal-900/50 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 pointer-events-auto backdrop-blur-xl">
            
            {/* Step Content */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-teal-950 pb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#7A9BA8]">
                  Step {activeStep + 1} of {details.steps.length}
                </span>
                <span className="text-xs text-teal-400 font-semibold uppercase tracking-wider">
                  {details.steps[activeStep].title}
                </span>
              </div>
              {/* Narration typewriter box */}
              <p className="text-xs md:text-sm text-[#E8F4F5] leading-relaxed font-normal min-h-[50px]">
                {displayedText}
                <span className={`inline-block w-1 h-3.5 ml-0.5 bg-[#4DD6DC] ${isTalking ? "opacity-100" : "opacity-0 animate-pulse"}`} />
              </p>
            </div>

            {/* Stepper Navigation and Method Switcher */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1 border-t border-teal-950">
              
              {/* Method Switcher Pills */}
              <div className="flex gap-2">
                {availableMethods.slice(0, 2).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMethod(m);
                      setActiveStep(0);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
                      m === method
                        ? "bg-[#0E7A80] border-[#0E7A80] text-white shadow-lg shadow-[#0E7A80]/20"
                        : "bg-[#0D1B2A]/40 border-teal-900/40 text-[#7A9BA8] hover:text-white"
                    }`}
                  >
                    {METHOD_DETAILS[m]?.title || m}
                  </button>
                ))}
              </div>

              {/* Step Navigation buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((prev) => prev - 1)}
                  className="border-teal-900 text-[#7A9BA8] hover:text-white hover:bg-teal-950/20"
                >
                  Back
                </Button>

                {/* Progress Indicators */}
                <div className="flex gap-1.5">
                  {details.steps.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                        idx === activeStep ? "bg-[#4DD6DC] w-4.5" : "bg-[#0D1B2A]"
                      }`}
                    />
                  ))}
                </div>

                {activeStep < details.steps.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={() => setActiveStep((prev) => prev + 1)}
                    className="bg-[#0E7A80] hover:bg-[#0A6268] text-white font-bold px-4"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={onClose}
                    className="bg-[#0E7A80] hover:bg-[#0A6268] text-white font-bold px-4"
                  >
                    Finish
                  </Button>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
