export interface DashboardData {
  generatedAt: string;
  institution: { name: string };
  metrics: {
    conversations: number;
    studentMessages: number;
    aiReplies: number;
    activeAlerts: number;
    publishedKnowledge: number;
    activeRules: number;
    pendingRegistrarRequests: number;
    deliveryRate: number | null;
  };
  conversations: Array<{
    id: string;
    status: string;
    channel: string;
    updatedAt: string;
    participant: string;
    messages: Array<{ id: string; senderKind: string; content: string; sentAt: string; citations: unknown }>;
  }>;
  registrarRequests: Array<{
    id: string;
    referenceNumber: string;
    kind: "DOCUMENT" | "APPOINTMENT";
    status: string;
    documentType: string | null;
    studentLastName: string | null;
    studentIdNumber: string | null;
    studentEmail: string | null;
    appointmentPurpose: string | null;
    preferredSchedule: string | null;
    submittedAt: string | null;
    readyNotifiedAt: string | null;
    createdAt: string;
    participant: string;
    statusEvents: Array<{
      id: string;
      fromStatus: string;
      toStatus: string;
      actorId: string | null;
      notifiedAt: string | null;
      createdAt: string;
    }>;
  }>;
  aiRuns: Array<{ id: string; model: string; outcome: string; createdAt: string; knowledgeVersionIds: unknown }>;
  alerts: Array<{ id: string; kind: string; status: string; attempts: number; lastErrorCode: string | null; occurredAt: string }>;
  rules: Array<{ id: string; name: string; instructions: string; priority: number; active: boolean }>;
  knowledge: Array<{ id: string; version: number; status: string; document: { title: string } }>;
  connectionError?: string;
}

export function dashboardApiUrl(): string {
  return (process.env.DASHBOARD_API_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
}

export function isLocalDashboardPreview(): boolean {
  try {
    const url = new URL(dashboardApiUrl());
    return url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1";
  } catch {
    return false;
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const apiUrl = dashboardApiUrl();
  const token = process.env.DASHBOARD_API_TOKEN?.trim();

  try {
    const response = await fetch(`${apiUrl}/admin/dashboard`, {
      cache: "no-store",
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) throw new Error(`The chatbot API returned status ${response.status}.`);
    return (await response.json()) as DashboardData;
  } catch (error) {
    return {
      ...emptyDashboard(),
      connectionError: error instanceof Error ? error.message : "The chatbot API could not be reached.",
    };
  }
}

function emptyDashboard(): DashboardData {
  return {
    generatedAt: new Date().toISOString(),
    institution: { name: "Luca" },
    metrics: { conversations: 0, studentMessages: 0, aiReplies: 0, activeAlerts: 0, publishedKnowledge: 0, activeRules: 0, pendingRegistrarRequests: 0, deliveryRate: null },
    conversations: [],
    registrarRequests: [],
    aiRuns: [],
    alerts: [],
    rules: [],
    knowledge: [],
  };
}
