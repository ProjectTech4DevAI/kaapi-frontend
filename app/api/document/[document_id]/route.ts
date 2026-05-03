import {
  proxyErrorResponse,
  proxyJsonResponse,
  withQueryParams,
} from "@/app/api/_routeProxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ document_id: string }> },
) {
  const { document_id } = await params;
  try {
    return await proxyJsonResponse(
      request,
      withQueryParams(
        `/api/v1/documents/${document_id}`,
        new URLSearchParams({ include_url: "true" }),
      ),
    );
  } catch (error: unknown) {
    return proxyErrorResponse("Document details proxy error:", error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ document_id: string }> },
) {
  const { document_id } = await params;

  try {
    return await proxyJsonResponse(
      request,
      `/api/v1/documents/${document_id}`,
      {
        method: "DELETE",
      },
    );
  } catch (error: unknown) {
    return proxyErrorResponse("Document delete proxy error:", error);
  }
}
