import { proxyErrorResponse, proxyJsonResponse } from "@/app/api/_routeProxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatbot_id: string }> },
) {
  try {
    const { chatbot_id } = await params;
    return await proxyJsonResponse(
      request,
      `/api/v1/chatbots/${encodeURIComponent(chatbot_id)}/flow/publish`,
      { method: "POST" },
    );
  } catch (error) {
    return proxyErrorResponse("chatbot flow publish error:", error);
  }
}
