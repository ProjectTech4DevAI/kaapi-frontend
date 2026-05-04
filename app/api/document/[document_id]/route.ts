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
    const queryParams = new URL(request.url).searchParams;
    const backendQueryParams = new URLSearchParams(queryParams);
    backendQueryParams.set("include_url", "true");

    return await proxyJsonResponse(
      request,
      withQueryParams(`/api/v1/documents/${document_id}`, backendQueryParams),
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
    const queryParams = new URL(request.url).searchParams;

    return await proxyJsonResponse(
      request,
      withQueryParams(`/api/v1/documents/${document_id}`, queryParams),
      {
        method: "DELETE",
      },
    );
  } catch (error: unknown) {
    return proxyErrorResponse("Document delete proxy error:", error);
  }
}
