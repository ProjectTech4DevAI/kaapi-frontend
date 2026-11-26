import { proxyErrorResponse, proxyJsonResponse } from "@/app/api/_routeProxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatbot_id: string }> },
) {
  try {
    const { chatbot_id } = await params;
    return await proxyJsonResponse(
      request,
      `/api/v1/chatbots/${encodeURIComponent(chatbot_id)}`,
    );
  } catch (error) {
    return proxyErrorResponse("chatbot get error:", error);
  }
}
