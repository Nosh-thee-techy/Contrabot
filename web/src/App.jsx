import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ChatPage from "./pages/ChatPage";
import ComparePage from "./pages/ComparePage";
import FacilitiesPage from "./pages/FacilitiesPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/compare" element={<ComparePage />} />
      <Route path="/facilities" element={<FacilitiesPage />} />
    </Routes>
  );
}
