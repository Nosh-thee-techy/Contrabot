import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";

class AvatarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn("Avatar WebGL render error, falling back to illustration:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function DoctorModel({ url, currentState, isTalking, currentAnimation }) {
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, scene);

  useEffect(() => {
    // Idle animation always playing as base layer
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
    // Trigger talk animation when bot is sending a message
    if (actions && actions["TalkingOne"]) {
      if (isTalking) {
        actions["TalkingOne"].reset().fadeIn(0.3).play();
      } else {
        actions["TalkingOne"].fadeOut(0.3);
      }
    }
  }, [isTalking, actions]);

  useEffect(() => {
    // React to user message with custom animations (e.g. Nod)
    if (actions && currentAnimation && actions[currentAnimation] && currentAnimation !== "Idle") {
      actions[currentAnimation].reset().fadeIn(0.2).play();
      const timer = setTimeout(() => {
        if (actions[currentAnimation]) {
          actions[currentAnimation].fadeOut(0.2);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentAnimation, actions]);

  useEffect(() => {
    // React to conversation state with gesture animations
    const stateAnimations = {
      0: "Wave",         // Welcome state — doctor waves
      7: "ThumbsUp",     // Recommendation delivered — thumbs up
    };
    const anim = stateAnimations[currentState];
    if (anim && actions && actions[anim]) {
      actions[anim].reset().fadeIn(0.3).play();
      const timer = setTimeout(() => {
        if (actions[anim]) {
          actions[anim].fadeOut(0.5);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentState, actions]);

  return <primitive object={scene} scale={1} position={[0, -0.9, 0]} />;
}

// Check WebGL availability
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

export default function DoctorAvatar({ doctorId, isTalking, chatState, currentAnimation }) {
  const [webGLSupported, setWebGLSupported] = useState(true);
  const doctorName = doctorId === "amara" ? "Amara" : "Kofi";
  const url = doctorId === "amara" ? "/avatars/doctor-female.glb" : "/avatars/doctor-male.glb";

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setWebGLSupported(false);
    }
  }, []);

  const fallbackUI = (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <img
        src={`/avatars/${doctorId}-illustration.png`}
        alt={`Dr. ${doctorName}`}
        className="w-48 h-48 object-contain rounded-full shadow-md border border-teal-500 bg-white"
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
      <p className="text-teal-700 font-semibold text-lg">Dr. {doctorName}</p>
      <p className="text-gray-500 text-xs">AI Contraception Counselor</p>
    </div>
  );

  if (!webGLSupported) {
    return fallbackUI;
  }

  return (
    <AvatarErrorBoundary fallback={fallbackUI}>
      <div className="w-full h-full relative" style={{ pointerEvents: "none" }}>
        <Suspense fallback={fallbackUI}>
          <Canvas
            camera={{ position: [0, 1.4, 2.2], fov: 42 }}
            style={{ background: "transparent", width: "100%", height: "100%" }}
            gl={{ alpha: true, antialias: true }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[2, 4, 2]} intensity={1.2} castShadow />
            <pointLight position={[-2, 2, 1]} intensity={0.4} color="#0E7A80" />
            <DoctorModel
              url={url}
              currentState={chatState}
              isTalking={isTalking}
              currentAnimation={currentAnimation}
            />
          </Canvas>
        </Suspense>
      </div>
    </AvatarErrorBoundary>
  );
}
