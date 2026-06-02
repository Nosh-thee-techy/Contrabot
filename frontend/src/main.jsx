import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import ChatPage from "./pages/ChatPage";
import ChwPage from "./pages/ChwPage";
import ComparePage from "./pages/ComparePage";
import "./styles.css";

function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <strong>ContraBot</strong>
        <Link to="/">Chat</Link>
        <Link to="/compare">Compare Methods</Link>
        <Link to="/chw">CHW Dashboard</Link>
      </nav>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/chw" element={<ChwPage />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
