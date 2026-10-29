export default function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-[chat-pulse_1.4s_ease-in-out_infinite]" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-[chat-pulse_1.4s_ease-in-out_0.2s_infinite]" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-[chat-pulse_1.4s_ease-in-out_0.4s_infinite]" />
    </div>
  );
}
