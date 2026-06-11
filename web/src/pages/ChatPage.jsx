import { useEffect, useRef, useState, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { RotateCcw, Send, Info, User, HelpCircle } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChatBubble, TypingIndicator } from "@/components/chat/ChatBubble";
import { RecommendationCard } from "@/components/chat/RecommendationCard";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { useChatStore } from "@/store/useChatStore";
import { useAppStore } from "@/store/useAppStore";
import { useChatFlow } from "@/hooks/useChatFlow";
import BodyVisualization from "@/components/chat/BodyVisualization";
import DoctorSelection from "@/components/chat/DoctorSelection";

const QUICK = {
  0: ["Yes, let's go →", "What is this?"],
  1: ["Under 18", "18–24", "25–34", "35–44", "45+"],
  2: ["Yes", "No"],
  4: ["Set it and forget it", "I want daily control", "Prefer non-hormonal", "I'm not sure yet"],
  5: ["I can visit a clinic", "Pharmacy only", "Through a CHW only"],
  8: ["Side effect help", "I'm already on a method", "Start over", "Find a clinic"],
};

const HEALTH_OPTIONS = [
  "High blood pressure",
  "Migraines with aura",
  "History of blood clots",
  "Diabetes",
  "Liver disease",
  "Breast cancer history",
  "None of these",
];

// -------------------------------------------------------------
// Doctor 3D Model Component inside ChatPage Canvas
// -------------------------------------------------------------
function MainDoctorModel({ url, isTalking, currentAnimation }) {
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, scene);
  
  const modelRef = useRef();
  const headRef = useRef();

  useEffect(() => {
    // Find head bone for wiggling
    scene.traverse((child) => {
      if (child.isBone && child.name.toLowerCase().includes("head")) {
        headRef.current = child;
      }
    });

    if (actions && actions["Idle"]) {
      actions["Idle"].play();
    }
    return () => {
      if (actions && actions["Idle"]) {
        actions["Idle"].stop();
      }
    };
  }, [scene, actions]);

  useEffect(() => {
    if (actions && actions["TalkingOne"]) {
      if (isTalking) {
        actions["TalkingOne"].reset().fadeIn(0.3).play();
      } else {
        actions["TalkingOne"].fadeOut(0.3);
      }
    }
  }, [isTalking, actions]);

  useEffect(() => {
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

  // Gentle breathing idle movement + talking bob wiggles
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (modelRef.current) {
      // Idle breathing
      modelRef.current.position.y = -0.9 + Math.sin(time * 0.8) * 0.008;
      modelRef.current.rotation.y = Math.sin(time * 0.3) * 0.04;
    }

    if (isTalking && headRef.current) {
      // Head-bobbing
      headRef.current.rotation.x = Math.sin(time * 6) * 0.03;
      headRef.current.rotation.z = Math.sin(time * 4) * 0.015;
    }
  });

  return <primitive ref={modelRef} object={scene} scale={0.95} position={[0, -0.9, 0]} />;
}

// -------------------------------------------------------------
// Ambient Background Particle Field Component
// -------------------------------------------------------------
function BackgroundParticles() {
  const count = 50;
  const pointsRef = useRef();

  const [positions] = useState(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2.2;     // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2.2; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5; // z
    }
    return pos;
  });

  useFrame(() => {
    if (pointsRef.current) {
      const positionsArr = pointsRef.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        positionsArr[i * 3 + 1] += 0.0006; // drift upward slowly
        if (positionsArr[i * 3 + 1] > 1.1) {
          positionsArr[i * 3 + 1] = -1.1; // wrap around bottom
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#ffffff"
        transparent
        opacity={0.12}
        sizeAttenuation
      />
    </points>
  );
}

// -------------------------------------------------------------
// Main ChatPage Redesign Component
// -------------------------------------------------------------
export default function ChatPage() {
  const prefill = useAppStore((s) => s.prefillChat);
  const setPrefillChat = useAppStore((s) => s.setPrefillChat);
  const { flowState, messages, profile, recommendations, loading, loadingStep, reset, doctorState, setDoctor } = useChatStore();
  const { handleQuickReply, initWelcome } = useChatFlow();
  
  const [input, setInput] = useState("");
  const [selectedHealth, setSelectedHealth] = useState([]);
  const [showMobileDoctorSheet, setShowMobileDoctorSheet] = useState(false);
  const [showSidebarSheet, setShowSidebarSheet] = useState(false);
  const [activeVisMethod, setActiveVisMethod] = useState(null);
  
  const bottomRef = useRef(null);

  // Gentle pulse opacity logic for radial gradient glow
  const [glowOpacity, setGlowOpacity] = useState(0.14);
  // Highlight border flash logic
  const [borderFlash, setBorderFlash] = useState(false);
  const prevMsgCount = useRef(messages.length);

  useEffect(() => {
    initWelcome();
    if (prefill === "side_effects") {
      useChatStore.getState().setFlowState(8);
      useChatStore.getState().setSideEffectFlow({ step: "method" });
      useChatStore.getState().addMessage({
        role: "bot",
        text: "Which method are you using?",
        timestamp: new Date().toLocaleTimeString(),
      });
      setPrefillChat(null);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle gentle pulse of teal halo behind doctor
  useEffect(() => {
    const interval = setInterval(() => {
      const sec = Date.now() / 1000;
      // Oscillate between 0.10 and 0.18 over a 4s cycle
      setGlowOpacity(0.14 + Math.sin(sec * (Math.PI * 2 / 4)) * 0.04);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Handle border flash on new bot message
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === "bot") {
        setBorderFlash(true);
        const timer = setTimeout(() => setBorderFlash(false), 1200);
        return () => clearTimeout(timer);
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages]);

  const confirmHealth = () => {
    const flags = selectedHealth.includes("None of these") ? [] : selectedHealth;
    useChatStore.getState().updateProfile({ health_flags: flags });
    useChatStore.getState().setFlowState(4);
    useChatStore.getState().addMessage({ role: "user", text: flags.length ? flags.join(", ") : "None", timestamp: new Date().toLocaleTimeString() });
    useChatStore.getState().addMessage({
      role: "bot",
      text: "What matters most to you in a contraceptive method?",
      timestamp: new Date().toLocaleTimeString(),
    });
    setSelectedHealth([]);
  };

  const toggleHealth = (opt) => {
    if (opt === "None of these") {
      setSelectedHealth(["None of these"]);
      return;
    }
    setSelectedHealth((prev) => {
      const next = prev.filter((x) => x !== "None of these");
      return next.includes(opt) ? next.filter((x) => x !== opt) : [...next, opt];
    });
  };

  const sendFreeText = () => {
    if (!input.trim()) return;
    handleQuickReply(input.trim());
    setInput("");
  };

  if (doctorState.chosen === null) {
    return <DoctorSelection />;
  }

  const doctorName = doctorState.chosen === "amara" ? "Amara" : "Kofi";
  const doctorUrl = doctorState.chosen === "amara" ? "/avatars/doctor-female.glb" : "/avatars/doctor-male.glb";

  return (
    <>
      <Helmet>
        <title>Chat — ContraBot</title>
        <meta name="description" content="Private contraception counseling chat." />
      </Helmet>

      {/* Background drifting particles (rendered behind everything) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Canvas camera={{ position: [0, 0, 1] }} gl={{ alpha: true, antialias: true }}>
          <BackgroundParticles />
        </Canvas>
      </div>

      {/* Floating Mobile Doctor Avatar Button */}
      <div
        className="md:hidden fixed top-3.5 left-3.5 z-40 w-11 h-11 rounded-full border-2 border-[#0E7A80] bg-[#111F2E] shadow-lg overflow-hidden cursor-pointer"
        onClick={() => setShowMobileDoctorSheet(true)}
      >
        <img
          src={`/avatars/${doctorState.chosen}-illustration.png`}
          alt="Doctor"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </div>

      {/* Overall Container */}
      <div className="flex h-screen flex-col bg-[#0D1B2A] text-[#E8F4F5] font-sans relative z-10">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#0E7A80]/15 bg-[#0D1B2A] px-4 py-3 h-16 relative z-20">
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <Logo showText={false} />
            </div>
            <div className="pl-14 md:pl-0">
              <p className="font-bold text-white text-base leading-none mb-1 select-none">ContraBot</p>
              <p className="text-[11px] text-[#7A9BA8] flex items-center gap-1.5 font-medium select-none">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2E7D32] pulse-green" />
                Dr. {doctorName} · Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector className="w-32 hidden sm:block border-[#0E7A80]/20 bg-[#111F2E] text-white" />
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-[#7A9BA8] hover:text-white"
              onClick={() => setShowSidebarSheet(true)}
              aria-label="Info"
            >
              <Info className="h-4.5 w-4.5" />
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Restart" className="text-[#7A9BA8] hover:text-white">
                  <RotateCcw className="h-4.5 w-4.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111F2E] border border-teal-900 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Start over?</DialogTitle>
                  <DialogDescription className="text-[#7A9BA8]">
                    Your current answers will be cleared. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 pt-3">
                  <Button
                    onClick={() => {
                      reset();
                      initWelcome();
                    }}
                    className="bg-[#0E7A80] hover:bg-[#0A6268] text-white font-bold"
                  >
                    Yes, start over
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden w-full relative z-10">
          
          {/* Column 1: Redesigned Doctor Panel (28% width) */}
          <div className="hidden md:flex md:w-[28%] flex-col border-r border-[#0E7A80]/15 bg-[#0D1B2A] p-5 justify-between items-center h-full overflow-hidden relative">
            
            {/* Subtle radial glow pulsing behind the doctor */}
            <div
              className="absolute inset-0 z-0 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 50% 60%, rgba(14,122,128,${glowOpacity}) 0%, transparent 60%)`
              }}
            />

            {/* Doctor 3D Canvas */}
            <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10">
              <div className="w-full h-[380px] max-h-[380px] mb-3">
                <Suspense fallback={
                  <div className="w-full h-full flex items-center justify-center text-[#7A9BA8] text-xs">
                    Initializing avatar...
                  </div>
                }>
                  <Canvas
                    camera={{ position: [0, 0.2, 2.8], fov: 38 }}
                    style={{ background: "transparent", width: "100%", height: "100%" }}
                    gl={{ alpha: true, antialias: true }}
                  >
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[1, 3, 2]} intensity={1.0} color="#ffffff" />
                    <pointLight position={[-1, 1, 1]} intensity={0.8} color="#0E7A80" />
                    <pointLight 
                      position={[1, -1, 2]} 
                      intensity={doctorState.isTalking ? 0.7 + Math.sin(Date.now() * 0.005) * 0.3 : 0.3} 
                      color="#5C3C7A" 
                    />
                    <MainDoctorModel
                      url={doctorUrl}
                      isTalking={doctorState.isTalking}
                      currentAnimation={doctorState.currentAnimation}
                    />
                  </Canvas>
                </Suspense>
              </div>

              {/* Doctor DOM details */}
              <div className="text-center space-y-1.5 select-none">
                <h3 className="text-[#0E7A80] font-bold text-lg" style={{ fontFamily: "Cambria, Georgia, serif" }}>
                  Dr. {doctorName}
                </h3>
                <p className="text-[11px] text-[#7A9BA8] font-medium tracking-wide">AI Contraception Counselor</p>
              </div>
            </div>

            {/* Animated speaking indicator and switch doctor link */}
            <div className="w-full flex flex-col items-center gap-3 relative z-10 border-t border-[#0E7A80]/10 pt-4">
              {doctorState.isTalking ? (
                <div className="flex items-center gap-1.5 py-1">
                  <span className="waveform-bar waveform-bar-1 bg-[#0E7A80]" />
                  <span className="waveform-bar waveform-bar-2 bg-[#0E7A80]" />
                  <span className="waveform-bar waveform-bar-3 bg-[#0E7A80]" />
                  <span className="waveform-bar bg-[#0E7A80]" style={{ animationDelay: "0.5s" }} />
                  <span className="text-[10px] text-[#4DD6DC] font-bold tracking-wider ml-1 uppercase">Speaking</span>
                </div>
              ) : (
                <div className="h-7" /> // spacer
              )}

              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-[#0E7A80] hover:text-[#4DD6DC] hover:underline text-xs font-bold transition-colors cursor-pointer uppercase tracking-wider">
                    Switch Counselor
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-[#111F2E] border border-teal-900 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Switch Counselor</DialogTitle>
                    <DialogDescription className="text-[#7A9BA8]">
                      Swap your current counselor without clearing your conversation history.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-4 justify-center py-4">
                    <Button
                      variant={doctorState.chosen === "amara" ? "default" : "outline"}
                      onClick={() => setDoctor("amara")}
                      className={doctorState.chosen === "amara" ? "bg-[#0E7A80] text-white" : "border-[#0E7A80] text-teal-400"}
                    >
                      Dr. Amara
                    </Button>
                    <Button
                      variant={doctorState.chosen === "kofi" ? "default" : "outline"}
                      onClick={() => setDoctor("kofi")}
                      className={doctorState.chosen === "kofi" ? "bg-[#0E7A80] text-white" : "border-[#0E7A80] text-teal-400"}
                    >
                      Dr. Kofi
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Column 2: Redesigned Chat Panel (44% width) */}
          <div className={cn(
            "flex w-full flex-col border-r border-[#0E7A80]/15 md:w-[44%] h-full bg-[#111F2E]/95 backdrop-blur-md relative z-10 transition-all duration-300",
            borderFlash && "border-teal-500 shadow-[0_0_15px_rgba(14,122,128,0.2)] animate-border-flash"
          )}>
            
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {messages.map((m) =>
                m.type === "recommendation" ? (
                  <RecommendationCard
                    key={m.id}
                    data={m.data}
                    onShowVisualization={(methodId) => setActiveVisMethod(methodId)}
                  />
                ) : m.type === "side_effect" ? (
                  <ChatBubble key={m.id} role="bot">
                    <div className="rounded-xl bg-[#E07B39]/10 border border-[#E07B39]/30 p-3.5 text-xs text-[#E8F4F5] leading-relaxed">
                      {m.text}
                    </div>
                  </ChatBubble>
                ) : (
                  <ChatBubble key={m.id} role={m.role} timestamp={m.timestamp}>
                    {m.text}
                  </ChatBubble>
                )
              )}
              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Input & Quick Reply Controls Container */}
            <div className="bg-white/5 border-t border-[#0E7A80]/20 p-4 space-y-4">
              
              {/* Special checklist options for flowState 3 (Health issues) */}
              {flowState === 3 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {HEALTH_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleHealth(opt)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-300",
                          selectedHealth.includes(opt) 
                            ? "border-teal-400 bg-[#0E7A80]/20 text-teal-300 shadow-md" 
                            : "border-teal-900/40 text-[#7A9BA8] hover:border-teal-800 hover:text-white"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {selectedHealth.length > 0 && (
                    <Button size="sm" onClick={confirmHealth} className="bg-[#0E7A80] hover:bg-[#0A6268] text-white font-bold px-4 py-1.5 rounded-lg">
                      Continue →
                    </Button>
                  )}
                </div>
              )}

              {/* Standard Quick Reply buttons */}
              {flowState !== 3 && (QUICK[flowState] || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(QUICK[flowState] || []).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleQuickReply(q)}
                      className="bg-transparent border border-[#0E7A80]/50 hover:bg-[#0E7A80]/20 hover:border-[#0E7A80] text-[#4DD6DC] hover:text-white text-xs font-medium px-4 py-2 rounded-full transition-all duration-200 hover:-translate-y-0.5 select-none"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Message Input Box */}
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendFreeText()}
                  placeholder="Ask a question or tap a reply..."
                  className="bg-white/8 border border-[#0E7A80]/30 hover:border-[#0E7A80]/50 focus:border-[#0E7A80] text-white rounded-full px-5 py-2.5 text-sm h-11 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder-[#7A9BA8]/50"
                />
                <Button 
                  size="icon" 
                  onClick={sendFreeText} 
                  aria-label="Send"
                  className="h-11 w-11 rounded-full bg-[#0E7A80] hover:bg-[#0A6268] text-white shadow-lg shadow-[#0E7A80]/25 transition-all duration-200 flex items-center justify-center shrink-0"
                >
                  <Send className="h-4.5 w-4.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Column 3: Redesigned Sidebar Panel (28% width) */}
          <aside className="hidden w-[28%] overflow-y-auto bg-[#0F1E2D]/95 p-6 md:block z-10 border-l border-[#0E7A80]/10">
            <ChatSidebar
              flowState={flowState}
              profile={profile}
              recommendations={recommendations}
              loading={loading}
              loadingStep={loadingStep}
            />
          </aside>
        </div>
      </div>

      {/* Mobile Doctor Bottom Sheet Drawer */}
      {showMobileDoctorSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center md:hidden"
          onClick={() => setShowMobileDoctorSheet(false)}
        >
          <div
            className="bg-[#111F2E] border-t border-teal-900 w-full max-w-md rounded-t-3xl p-6 flex flex-col items-center gap-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center border-b border-teal-950 pb-2">
              <h3 className="font-bold text-white text-base">Your Counselor</h3>
              <button
                className="text-teal-400 font-semibold px-2 py-1"
                onClick={() => setShowMobileDoctorSheet(false)}
              >
                Close
              </button>
            </div>
            
            {/* 3D Model in mobile popup */}
            <div className="w-44 h-44">
              <Canvas
                camera={{ position: [0, 0.2, 2.8], fov: 38 }}
                style={{ background: "transparent", width: "100%", height: "100%" }}
                gl={{ alpha: true, antialias: true }}
              >
                <ambientLight intensity={0.4} />
                <directionalLight position={[1, 3, 2]} intensity={1.0} color="#ffffff" />
                <pointLight position={[-1, 1, 1]} intensity={0.8} color="#0E7A80" />
                <pointLight position={[1, -1, 2]} intensity={0.3} color="#5C3C7A" />
                <MainDoctorModel
                  url={doctorUrl}
                  isTalking={doctorState.isTalking}
                  currentAnimation={doctorState.currentAnimation}
                />
              </Canvas>
            </div>

            <div className="text-center select-none space-y-1">
              <h4 className="text-[#0E7A80] font-bold text-lg" style={{ fontFamily: "Cambria, Georgia, serif" }}>
                Dr. {doctorName}
              </h4>
              <p className="text-[11px] text-[#7A9BA8] font-medium">AI Contraception Counselor</p>
            </div>

            <div className="w-full pt-3 mt-1 border-t border-teal-950">
              <Button
                variant="outline"
                onClick={() => {
                  setDoctor(doctorState.chosen === "amara" ? "kofi" : "amara");
                }}
                className="w-full border-[#0E7A80] text-teal-400 hover:bg-[#0E7A80]/10"
              >
                Switch to Dr. {doctorState.chosen === "amara" ? "Kofi" : "Amara"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Info Sidebar Drawer */}
      {showSidebarSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center md:hidden"
          onClick={() => setShowSidebarSheet(false)}
        >
          <div
            className="bg-[#111F2E] border-t border-teal-900 w-full max-w-md rounded-t-3xl p-6 overflow-y-auto max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 border-b border-teal-950 pb-2">
              <h3 className="font-bold text-white text-base">Assessment Info</h3>
              <button
                className="text-teal-400 font-semibold px-2 py-1"
                onClick={() => setShowSidebarSheet(false)}
              >
                Close
              </button>
            </div>
            <ChatSidebar
              flowState={flowState}
              profile={profile}
              recommendations={recommendations}
              loading={loading}
              loadingStep={loadingStep}
            />
          </div>
        </div>
      )}

      {/* 3D Body Visualization Overlay Modal */}
      {activeVisMethod && (
        <BodyVisualization
          method={activeVisMethod}
          doctorId={doctorState.chosen}
          onClose={() => setActiveVisMethod(null)}
          recommendations={recommendations}
        />
      )}
    </>
  );
}
