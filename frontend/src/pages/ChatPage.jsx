import { useState } from "react";
import { postChat } from "../api";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm ContraBot. Ask about contraception or type 'start' for guided intake." },
  ]);
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => `web-${Date.now()}`);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setInput("");
    try {
      const data = await postChat(userMsg, sessionId);
      setMessages((m) => [...m, { role: "bot", text: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Sorry, I couldn't reach the server." }]);
    }
  }

  return (
    <div className="page chat-page">
      <div className="chat-window">
        {messages.map((msg, i) => (
          <div key={i} className={`bubble ${msg.role}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message..." />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
