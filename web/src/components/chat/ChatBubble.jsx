import { cn } from "@/lib/utils";

export function ChatBubble({ role, children, timestamp }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
          CB
        </div>
      )}
      <div className={cn("max-w-[85%]", isUser && "text-right")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm",
            isUser ? "bg-primary text-white" : "border-l-4 border-primary bg-white shadow-sm"
          )}
        >
          {children}
        </div>
        {timestamp && <p className="mt-1 text-xs text-muted">{timestamp}</p>}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">CB</div>
      <div className="flex items-center gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
      </div>
    </div>
  );
}
