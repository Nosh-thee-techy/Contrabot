import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { RotateCcw, Send, Info } from "lucide-react";
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
import DoctorAvatar from "@/components/chat/DoctorAvatar";
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

export default function ChatPage() {
  const prefill = useAppStore((s) => s.prefillChat);
  const setPrefillChat = useAppStore((s) => s.setPrefillChat);
  const { flowState, messages, profile, recommendations, loading, loadingStep, reset, doctorState, setDoctor } = useChatStore();
  const { handleQuickReply, initWelcome } = useChatFlow();
  const [input, setInput] = useState("");
  const [selectedHealth, setSelectedHealth] = useState([]);
  const [showMobileDoctorSheet, setShowMobileDoctorSheet] = useState(false);
  const [showSidebarSheet, setShowSidebarSheet] = useState(false);
  const bottomRef = useRef(null);

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

  return (
    <>
      <Helmet>
        <title>Chat — ContraBot</title>
        <meta name="description" content="Private contraception counseling chat." />
      </Helmet>

      {/* Floating Mobile Doctor Avatar Button */}
      <div
        className="md:hidden fixed top-3.5 left-3.5 z-50 w-11 h-11 rounded-full border-2 border-teal-500 bg-white shadow-lg overflow-hidden cursor-pointer"
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

      <div className="flex h-screen flex-col bg-page">
        <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 h-16">
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <Logo showText={false} />
            </div>
            <div className="pl-14 md:pl-0">
              <p className="font-semibold text-ink">ContraBot</p>
              <p className="text-xs text-muted flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-success pulse-green mr-0.5" />
                Dr. {doctorName} · Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector className="w-32 hidden sm:block" />
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted hover:text-ink"
              onClick={() => setShowSidebarSheet(true)}
              aria-label="Info"
            >
              <Info className="h-4 w-4" />
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Restart">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start over?</DialogTitle>
                  <DialogDescription>Your current answers will be cleared. This cannot be undone.</DialogDescription>
                </DialogHeader>
                <Button
                  onClick={() => {
                    reset();
                    initWelcome();
                  }}
                >
                  Yes, start over
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden w-full">
          {/* Column 1: Doctor Panel (28%) */}
          <div className="hidden md:flex md:w-[28%] flex-col border-r border-line bg-white p-6 justify-between items-center h-full overflow-y-auto">
            <div className="flex-1 w-full flex flex-col items-center justify-center">
              <div className="w-full h-80 max-h-80 mb-4">
                <DoctorAvatar
                  doctorId={doctorState.chosen}
                  isTalking={doctorState.isTalking}
                  chatState={flowState}
                  currentAnimation={doctorState.currentAnimation}
                />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-teal-800">Dr. {doctorName}</h3>
                <p className="text-xs text-muted mb-3">AI Contraception Counselor</p>
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-success">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-success pulse-green" />
                  Online
                </div>
              </div>
            </div>

            {/* Subtle animated speaking indicator */}
            {doctorState.isTalking && (
              <div className="flex items-center gap-1 py-2">
                <span className="waveform-bar waveform-bar-1" />
                <span className="waveform-bar waveform-bar-2" />
                <span className="waveform-bar waveform-bar-3" />
                <span className="text-xs text-teal-600 font-medium ml-1">Speaking...</span>
              </div>
            )}

            {/* Switch doctor link */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="text-teal-600 hover:text-teal-700 hover:underline text-xs font-semibold mt-4 cursor-pointer">
                  Switch doctor
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Switch Counselor</DialogTitle>
                  <DialogDescription>Swap your current counselor without clearing your conversation history.</DialogDescription>
                </DialogHeader>
                <div className="flex gap-4 justify-center py-4">
                  <Button
                    variant={doctorState.chosen === "amara" ? "default" : "outline"}
                    onClick={() => setDoctor("amara")}
                  >
                    Dr. Amara
                  </Button>
                  <Button
                    variant={doctorState.chosen === "kofi" ? "default" : "outline"}
                    onClick={() => setDoctor("kofi")}
                  >
                    Dr. Kofi
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Column 2: Chat Window (44% desktop, 100% mobile) */}
          <div className="flex w-full flex-col border-r border-line md:w-[44%] h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) =>
                m.type === "recommendation" ? (
                  <RecommendationCard key={m.id} data={m.data} />
                ) : m.type === "side_effect" ? (
                  <ChatBubble key={m.id} role="bot">
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">{m.text}</div>
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

            <div className="border-t border-line bg-white p-4 space-y-3">
              {flowState === 3 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {HEALTH_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleHealth(opt)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                          selectedHealth.includes(opt) ? "border-primary bg-primary/10 text-primary" : "border-line text-muted"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {selectedHealth.length > 0 && (
                    <Button size="sm" onClick={confirmHealth}>
                      Continue →
                    </Button>
                  )}
                </div>
              )}

              {flowState !== 3 && (QUICK[flowState] || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(QUICK[flowState] || []).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleQuickReply(q)}
                      className="rounded-full border border-primary/30 bg-white px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendFreeText()}
                  placeholder="Type a message or tap an option above..."
                />
                <Button size="icon" onClick={sendFreeText} aria-label="Send">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Column 3: Info Sidebar (28%) */}
          <aside className="hidden w-[28%] overflow-y-auto bg-page p-6 md:block">
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

      {/* Mobile Doctor Bottom Sheet */}
      {showMobileDoctorSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center md:hidden"
          onClick={() => setShowMobileDoctorSheet(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-2xl p-6 flex flex-col items-center gap-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center border-b pb-2">
              <h3 className="font-semibold text-lg text-ink">Your Counselor</h3>
              <button
                className="text-gray-500 font-bold px-2 py-1"
                onClick={() => setShowMobileDoctorSheet(false)}
              >
                Close
              </button>
            </div>
            <div className="w-40 h-40">
              <DoctorAvatar
                doctorId={doctorState.chosen}
                isTalking={doctorState.isTalking}
                chatState={flowState}
                currentAnimation={doctorState.currentAnimation}
              />
            </div>
            <div className="text-center">
              <h4 className="text-xl font-bold text-teal-800">Dr. {doctorName}</h4>
              <p className="text-xs text-muted mb-2">AI Contraception Counselor</p>
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-success">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-success pulse-green" />
                Online
              </div>
            </div>

            <div className="flex gap-4 w-full justify-center mt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDoctor(doctorState.chosen === "amara" ? "kofi" : "amara");
                }}
                className="w-full border-teal-600 text-teal-700 hover:bg-teal-50"
              >
                Swap to Dr. {doctorState.chosen === "amara" ? "Kofi" : "Amara"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Info Sidebar Bottom Sheet */}
      {showSidebarSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center md:hidden"
          onClick={() => setShowSidebarSheet(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-2xl p-6 overflow-y-auto max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-semibold text-lg text-ink">ContraBot Guide</h3>
              <button
                className="text-gray-500 font-bold px-2 py-1"
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
    </>
  );
}

