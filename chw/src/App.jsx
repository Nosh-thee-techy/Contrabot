import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ConsultPage from "./pages/ConsultPage";
import OutcomesPage from "./pages/OutcomesPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/consult" element={<ConsultPage />} />
      <Route path="/outcomes" element={<OutcomesPage />} />
    </Routes>
  );
}
