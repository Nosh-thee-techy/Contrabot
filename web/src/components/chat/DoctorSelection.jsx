import React from "react";
import { useChatStore } from "@/store/useChatStore";
import DoctorAvatar from "./DoctorAvatar";

export default function DoctorSelection({ onSelect }) {
  const setDoctor = useChatStore((state) => state.setDoctor);

  const handleChoose = (name) => {
    setDoctor(name);
    if (onSelect) onSelect(name);
  };

  return (
    <div className="doctor-selection-overlay fixed inset-0 z-50 flex items-center justify-center bg-[#0D1B2A]/98 backdrop-blur-md p-4 overflow-y-auto">
      {/* Subtle radial glow pulsing in the background */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,rgba(14,122,128,0.12)_0%,transparent_70%)]" />

      <div className="doctor-selection-container max-w-4xl w-full text-center py-8 relative z-10">
        <h1 className="selection-title text-3xl font-bold text-white mb-2">
          Who would you like to speak with today?
        </h1>
        <p className="selection-subtitle text-[#7A9BA8] mb-8 max-w-lg mx-auto text-sm">
          Both doctors are equally qualified. Choose whoever you feel most comfortable with.
        </p>

        <div className="doctor-cards-grid flex flex-col md:flex-row gap-6 justify-center items-stretch mb-8">
          {/* Card 1: Dr. Amara */}
          <div
            className="doctor-card flex-1 bg-[#111F2E]/60 rounded-2xl p-6 shadow-xl border border-[#0E7A80]/20 cursor-pointer hover:border-teal-500 hover:shadow-[0_0_25px_rgba(14,122,128,0.25)] transition duration-300 flex flex-col items-center"
            onClick={() => handleChoose("amara")}
          >
            <div className="avatar-canvas-wrapper w-full h-64 mb-4">
              <DoctorAvatar doctorId="amara" isTalking={false} chatState={0} />
            </div>
            <h2 className="doctor-card-name text-2xl font-bold text-teal-400 mb-1">Dr. Amara</h2>
            <p className="doctor-card-title text-[#7A9BA8] text-sm mb-6">AI Contraception Counselor</p>
            <button className="choose-btn w-full bg-[#0E7A80] hover:bg-[#0A6268] text-white font-medium py-2 px-4 rounded-xl transition shadow-[0_0_15px_rgba(14,122,128,0.2)]">
              Choose Dr. Amara →
            </button>
          </div>

          {/* Card 2: Dr. Kofi */}
          <div
            className="doctor-card flex-1 bg-[#111F2E]/60 rounded-2xl p-6 shadow-xl border border-[#0E7A80]/20 cursor-pointer hover:border-teal-500 hover:shadow-[0_0_25px_rgba(14,122,128,0.25)] transition duration-300 flex flex-col items-center"
            onClick={() => handleChoose("kofi")}
          >
            <div className="avatar-canvas-wrapper w-full h-64 mb-4">
              <DoctorAvatar doctorId="kofi" isTalking={false} chatState={0} />
            </div>
            <h2 className="doctor-card-name text-2xl font-bold text-teal-400 mb-1">Dr. Kofi</h2>
            <p className="doctor-card-title text-[#7A9BA8] text-sm mb-6">AI Contraception Counselor</p>
            <button className="choose-btn w-full bg-[#0E7A80] hover:bg-[#0A6268] text-white font-medium py-2 px-4 rounded-xl transition shadow-[0_0_15px_rgba(14,122,128,0.2)]">
              Choose Dr. Kofi →
            </button>
          </div>
        </div>

        <button
          className="skip-link-btn text-[#7A9BA8] hover:text-[#4DD6DC] hover:underline font-medium text-sm transition"
          onClick={() => handleChoose("amara")}
        >
          Skip, use default →
        </button>
      </div>
    </div>
  );
}
