import {
  proxyErrorResponse,
  proxyJsonResponse,
  withQueryParams,
} from "@/app/api/_routeProxy";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ document_id: string }> },
) {
  const { document_id } = await params;

  try {
    const queryParams = new URL(request.url).searchParams;

    return await proxyJsonResponse(
      request,
      withQueryParams(
        `/api/v1/documents/${document_id}/permanent`,
        queryParams,
      ),
      {
        method: "DELETE",
      },
    );
  } catch (error: unknown) {
    return proxyErrorResponse("Permanent document delete proxy error:", error);
  }
}
