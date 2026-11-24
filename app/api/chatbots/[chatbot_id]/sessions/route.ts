import { proxyErrorResponse, proxyJsonResponse } from "@/app/api/_routeProxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatbot_id: string }> },
) {
  try {
    const { chatbot_id } = await params;
    const body = await request.json();
    return await proxyJsonResponse(
      request,
      `/api/v1/chatbots/${encodeURIComponent(chatbot_id)}/sessions`,
      { method: "POST", body: JSON.stringify(body) },
    );
  } catch (error) {
    return proxyErrorResponse("chatbot session create error:", error);
  }
}
