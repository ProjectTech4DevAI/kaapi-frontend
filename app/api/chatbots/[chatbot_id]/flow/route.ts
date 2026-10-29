import { proxyErrorResponse, proxyJsonResponse } from "@/app/api/_routeProxy";

type Params = { params: Promise<{ chatbot_id: string }> };

const flowPath = (chatbotId: string) =>
  `/api/v1/chatbots/${encodeURIComponent(chatbotId)}/flow`;

export async function GET(request: Request, { params }: Params) {
  try {
    const { chatbot_id } = await params;
    return await proxyJsonResponse(request, flowPath(chatbot_id));
  } catch (error) {
    return proxyErrorResponse("chatbot flow get error:", error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { chatbot_id } = await params;
    const body = await request.json();
    return await proxyJsonResponse(request, flowPath(chatbot_id), {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } catch (error) {
    return proxyErrorResponse("chatbot flow save error:", error);
  }
}
