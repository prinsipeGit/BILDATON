import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";
import { getDashboardData, isLocalDashboardPreview, type DashboardData } from "../dashboard-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registrar Review | Luca",
  description: "Review student document requests and send status updates through Luca."
};

type RequestItem = DashboardData["registrarRequests"][number];

export default async function RegistrarPage({
  searchParams
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const [dashboard, user, query] = await Promise.all([
    getDashboardData(),
    getChatGPTUser(),
    searchParams
  ]);
  if (!user && !isLocalDashboardPreview()) redirect(chatGPTSignInPath("/registrar"));

  const documents = dashboard.registrarRequests.filter((request) => request.kind === "DOCUMENT");
  const waiting = documents.filter((request) => nextStatus(request.status) !== null).length;
  const ready = documents.filter((request) => request.status === "READY_FOR_PICKUP").length;

  return (
    <main className="shell registrarShell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Back to Luca operations overview">
          <span className="brandMark" aria-hidden="true">L</span>
          <span><strong>Luca</strong><small>Registrar workspace</small></span>
        </Link>
        <div className="topbarActions">
          <Link className="refreshButton" href="/">Operations overview</Link>
          <Link className="refreshButton" href="/registrar">Refresh requests</Link>
          <div className="workerBadge" title={user?.email ?? "Local preview"}>
            {(user?.displayName ?? "Worker").slice(0, 1).toUpperCase()}
          </div>
        </div>
      </header>

      <section className="registrarHero">
        <div>
          <p className="eyebrow">Registrar · Staff review</p>
          <h1>Document request queue</h1>
          <p>Review student details, advance each request in order, and let Luca send Messenger updates automatically.</p>
        </div>
        <div className="registrarSummary" aria-label="Registrar queue summary">
          <div><strong>{waiting}</strong><span>Need action</span></div>
          <div><strong>{ready}</strong><span>Ready</span></div>
          <div><strong>{documents.length}</strong><span>Total shown</span></div>
        </div>
      </section>

      {query.updated ? (
        <div className="actionNotice successNotice" role="status">
          Status changed to {friendlyStatus(query.updated)}. Luca queued the student’s Messenger update.
        </div>
      ) : null}
      {query.error ? <div className="actionNotice errorNotice" role="alert">{query.error}</div> : null}
      {dashboard.connectionError ? <div className="actionNotice errorNotice" role="alert">{dashboard.connectionError}</div> : null}

      <section className="registrarQueue" aria-label="Student document requests">
        {documents.length === 0 ? (
          <div className="panel emptyState registrarEmpty">
            <strong>No confirmed document requests yet</strong>
            <p>Requests appear here after a student reviews their details and replies CONFIRM in Messenger.</p>
          </div>
        ) : documents.map((request) => <RegistrarCard request={request} key={request.id} />)}
      </section>

      <footer>
        <span>Luca Registrar Workspace</span>
        <span>Student details are for authorized Registrar review only.</span>
      </footer>
    </main>
  );
}

function RegistrarCard({ request }: { request: RequestItem }) {
  const next = nextStatus(request.status);
  const recentEvents = [...request.statusEvents].reverse();
  return (
    <article className="panel registrarCard">
      <div className="registrarCardHead">
        <div>
          <span className="requestReference">{request.referenceNumber}</span>
          <h2>{request.documentType ?? "Document request"}</h2>
          <p>Submitted {formatDateTime(request.submittedAt ?? request.createdAt)}</p>
        </div>
        <span className={`largeStatus status-${request.status.toLowerCase()}`}>{friendlyStatus(request.status)}</span>
      </div>

      <div className="requestDetails">
        <Detail label="Student last name" value={request.studentLastName} />
        <Detail label="Student ID" value={request.studentIdNumber} mono />
        <Detail label="Email" value={request.studentEmail} />
        <Detail label="Messenger" value={request.participant} />
      </div>

      <ol className="statusTrack" aria-label="Request progress">
        {[
          ["SUBMITTED", "Submitted"],
          ["APPROVED", "Approved"],
          ["PROCESSING", "Processing"],
          ["READY_FOR_PICKUP", "Ready for pickup"]
        ].map(([status, label], index) => {
          const currentIndex = workflowIndex(request.status);
          return <li className={index <= currentIndex ? "completeStep" : "futureStep"} key={status}><span>{index + 1}</span><strong>{label}</strong></li>;
        })}
      </ol>

      <div className="registrarCardFooter">
        <div className="notificationHistory">
          <strong>Update history</strong>
          {recentEvents.length === 0 ? <p>No staff status changes yet.</p> : (
            <ul>{recentEvents.map((event) => (
              <li key={event.id}>
                <span>{friendlyStatus(event.toStatus)}</span>
                <time>{formatDateTime(event.createdAt)}</time>
                <small>{event.notifiedAt ? "Student notified" : "Notification queued"}</small>
              </li>
            ))}</ul>
          )}
        </div>
        <div className="statusAction">
          {next ? (
            <>
              <p>{next.help}</p>
              <form action="/registrar/status" method="post">
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="status" value={next.status} />
                <button className={`statusButton button-${next.status.toLowerCase()}`} type="submit">{next.label}</button>
              </form>
            </>
          ) : (
            <div className="finishedState"><strong>Student pickup notice sent</strong><p>{request.readyNotifiedAt ? formatDateTime(request.readyNotifiedAt) : "Notification is queued."}</p></div>
          )}
        </div>
      </div>
    </article>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return <div><span>{label}</span><strong className={mono ? "monoValue" : undefined}>{value ?? "Not provided"}</strong></div>;
}

function nextStatus(status: string): { status: string; label: string; help: string } | null {
  if (["SUBMITTED", "IN_REVIEW", "NEEDS_INFORMATION"].includes(status)) {
    return { status: "APPROVED", label: "Approve request", help: "Confirms that Registrar staff accepted this request for processing." };
  }
  if (status === "APPROVED") {
    return { status: "PROCESSING", label: "Mark as processing", help: "Tells the student that Registrar work has started." };
  }
  if (status === "PROCESSING") {
    return { status: "READY_FOR_PICKUP", label: "Mark ready for pickup", help: "Sends the student the final pickup notification." };
  }
  return null;
}

function workflowIndex(status: string): number {
  if (status === "READY_FOR_PICKUP" || status === "COMPLETED") return 3;
  if (status === "PROCESSING") return 2;
  if (status === "APPROVED") return 1;
  return 0;
}

function friendlyStatus(status: string): string {
  return status.toLowerCase().replaceAll("_", " ");
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila"
  }).format(new Date(value));
}
