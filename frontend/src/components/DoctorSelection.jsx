import React from "react";
import { useStore } from "../store";
import DoctorAvatar from "./DoctorAvatar";

export default function DoctorSelection({ onSelect }) {
  const setDoctor = useStore((state) => state.setDoctor);

  const handleChoose = (name) => {
    setDoctor(name);
    if (onSelect) onSelect(name);
  };

  return (
    <div className="doctor-selection-overlay">
      <div className="doctor-selection-container">
        <h1 className="selection-title">Who would you like to speak with today?</h1>
        <p className="selection-subtitle">
          Both doctors are equally qualified. Choose whoever you feel most comfortable with.
        </p>

        <div className="doctor-cards-grid">
          {/* Card 1: Dr. Amara */}
          <div className="doctor-card" onClick={() => handleChoose("amara")}>
            <div className="avatar-canvas-wrapper">
              <DoctorAvatar doctorId="amara" isTalking={false} chatState={0} />
            </div>
            <h2 className="doctor-card-name">Dr. Amara</h2>
            <p className="doctor-card-title">AI Contraception Counselor</p>
            <button className="choose-btn">Choose Dr. Amara →</button>
          </div>

          {/* Card 2: Dr. Kofi */}
          <div className="doctor-card" onClick={() => handleChoose("kofi")}>
            <div className="avatar-canvas-wrapper">
              <DoctorAvatar doctorId="kofi" isTalking={false} chatState={0} />
            </div>
            <h2 className="doctor-card-name">Dr. Kofi</h2>
            <p className="doctor-card-title">AI Contraception Counselor</p>
            <button className="choose-btn">Choose Dr. Kofi →</button>
          </div>
        </div>

        <button
          className="skip-link-btn"
          onClick={() => handleChoose("amara")}
        >
          Skip, use default →
        </button>
      </div>
    </div>
  );
}
