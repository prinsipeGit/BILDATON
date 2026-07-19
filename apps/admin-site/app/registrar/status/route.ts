import { NextResponse } from "next/server";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { dashboardApiUrl, isLocalDashboardPreview } from "../../dashboard-data";

const ALLOWED_STATUSES = new Set(["APPROVED", "PROCESSING", "READY_FOR_PICKUP"]);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return new Response("Cross-origin status updates are not allowed.", { status: 403 });
  }

  const form = await request.formData();
  const requestId = String(form.get("requestId") ?? "").trim();
  const status = String(form.get("status") ?? "").trim();
  if (!requestId || !ALLOWED_STATUSES.has(status)) {
    return redirectToRegistrar(request, { error: "The requested status change was invalid." });
  }

  const user = await getChatGPTUser();
  if (!user && !isLocalDashboardPreview()) {
    return NextResponse.redirect(new URL(chatGPTSignInPath("/registrar"), request.url), 303);
  }

  const token = process.env.DASHBOARD_API_TOKEN?.trim();
  try {
    const response = await fetch(
      `${dashboardApiUrl()}/admin/registrar/requests/${encodeURIComponent(requestId)}/status`,
      {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status,
          actorId: user?.email ?? "local-dashboard-preview"
        })
      }
    );
    const body = await safeJson(response);
    if (!response.ok) {
      const message = typeof body?.error === "string" ? body.error : "The status could not be updated.";
      return redirectToRegistrar(request, { error: message });
    }
    return redirectToRegistrar(request, { updated: status });
  } catch {
    return redirectToRegistrar(request, { error: "Luca could not reach the registrar service. Please try again." });
  }
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function safeJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const value = await response.json();
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function redirectToRegistrar(
  request: Request,
  params: { updated?: string; error?: string }
): NextResponse {
  const url = new URL("/registrar", request.url);
  if (params.updated) url.searchParams.set("updated", params.updated);
  if (params.error) url.searchParams.set("error", params.error);
  return NextResponse.redirect(url, 303);
}
