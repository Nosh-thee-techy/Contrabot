import { cn } from "@/lib/utils";

export function ChatBubble({ role, children, timestamp }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row", "items-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0E7A80] text-xs font-extrabold text-white shadow-md border border-[#0E7A80]/30 select-none">
          CB
        </div>
      )}
      <div className={cn("max-w-[78%]", isUser && "text-right")}>
        <div
          className={cn(
            "text-sm font-normal leading-relaxed",
            isUser 
              ? "bg-gradient-to-br from-[#0E7A80] to-[#0A6268] text-white rounded-[18px_18px_4px_18px] px-4 py-3 shadow-[0_2px_12px_rgba(14,122,128,0.3)]" 
              : "bg-[#0e7a80]/12 border border-[#0e7a80]/25 text-[#E8F4F5] rounded-[4px_18px_18px_18px] px-4 py-3 backdrop-blur-md"
          )}
        >
          {children}
        </div>
        {timestamp && <p className="mt-1 text-[10px] text-[#7A9BA8] px-1">{timestamp}</p>}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0E7A80] text-xs font-extrabold text-white shadow-md border border-[#0E7A80]/30 select-none">
        CB
      </div>
      <div className="flex items-center gap-1.5 rounded-[4px_18px_18px_18px] bg-[#0e7a80]/12 border border-[#0e7a80]/25 px-5 py-4 backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-teal-400 typing-dot" style={{ animationDelay: "0s" }} />
        <span className="h-2 w-2 rounded-full bg-teal-400 typing-dot" style={{ animationDelay: "0.15s" }} />
        <span className="h-2 w-2 rounded-full bg-teal-400 typing-dot" style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}
