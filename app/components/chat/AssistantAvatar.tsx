import { ChatIcon } from "@/app/components/icons";

export default function AssistantAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-accent-primary text-white flex items-center justify-center shrink-0 mt-1">
      <ChatIcon className="w-4 h-4" />
    </div>
  );
}
