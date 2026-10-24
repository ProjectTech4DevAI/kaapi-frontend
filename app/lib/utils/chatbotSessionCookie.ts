import { AUTH_COOKIE_MAX_AGE, COOKIE_KEYS } from "@/app/lib/constants";
import { readClientCookie } from "@/app/lib/utils";

export function readChatbotSessionCookie(): string | null {
  return readClientCookie(COOKIE_KEYS.CHATBOT_SESSION) || null;
}

export function clearChatbotSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_KEYS.CHATBOT_SESSION}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function writeChatbotSessionCookie(sessionId: string): void {
  if (typeof document === "undefined") return;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  document.cookie = `${COOKIE_KEYS.CHATBOT_SESSION}=${encodeURIComponent(
    sessionId,
  )}; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}
