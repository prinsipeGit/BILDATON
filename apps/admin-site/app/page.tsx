import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";
import { getDashboardData, isLocalDashboardPreview } from "./dashboard-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Luca Messenger Operations",
  description: "Monitor Luca's Messenger conversations, AI replies, knowledge, and delivery health.",
};

export default async function Home() {
  const [dashboard, user] = await Promise.all([getDashboardData(), getChatGPTUser()]);
  if (!user && !isLocalDashboardPreview()) redirect(chatGPTSignInPath("/"));
  const healthy = dashboard.metrics.activeAlerts === 0 && !dashboard.connectionError;

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Luca operations home">
          <span className="brandMark" aria-hidden="true">L</span>
          <span>
            <strong>Luca</strong>
            <small>Messenger operations</small>
          </span>
        </a>
        <div className="topbarActions">
          <span className={`systemStatus ${healthy ? "isHealthy" : "needsAttention"}`}>
            <span className="statusDot" aria-hidden="true" />
            {healthy ? "Chatbot online" : "Needs attention"}
          </span>
          <form action="/" method="get"><button className="refreshButton" type="submit" aria-label="Refresh dashboard data">Refresh</button></form>
          <div className="workerBadge" title={user?.email ?? "Local preview"}>
            {(user?.displayName ?? "Worker").slice(0, 1).toUpperCase()}
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">{dashboard.institution.name} · Live monitor</p>
          <h1>{healthy ? "Messenger is answering students." : "Messenger needs a quick check."}</h1>
          <p className="heroCopy">
            Every reply below comes from the published Supabase knowledge base and the active chatbot rules.
          </p>
        </div>
        <div className="updatedBlock">
          <span>Last checked</span>
          <strong>{formatTime(dashboard.generatedAt)}</strong>
          <small>Refreshes when you reopen this page</small>
        </div>
      </section>

      {dashboard.connectionError ? (
        <section className="connectionNotice" role="alert">
          <strong>Dashboard data is temporarily unavailable.</strong>
          <span>{dashboard.connectionError}</span>
        </section>
      ) : null}

      <section className="metrics" aria-label="Chatbot summary">
        <Metric label="Conversations" value={dashboard.metrics.conversations} detail="Messenger threads" />
        <Metric label="Student messages" value={dashboard.metrics.studentMessages} detail="Questions received" />
        <Metric label="AI replies" value={dashboard.metrics.aiReplies} detail="Answers generated" />
        <Metric
          label="Registrar queue"
          value={dashboard.metrics.pendingRegistrarRequests}
          detail={dashboard.metrics.pendingRegistrarRequests === 0 ? "No requests waiting" : "Requests need staff review"}
          tone={dashboard.metrics.pendingRegistrarRequests === 0 ? "good" : "warning"}
        />
        <Metric
          label="Delivery rate"
          value={dashboard.metrics.deliveryRate === null ? "—" : `${dashboard.metrics.deliveryRate}%`}
          detail="Replies reaching Messenger"
          tone={dashboard.metrics.deliveryRate !== null && dashboard.metrics.deliveryRate < 95 ? "warning" : "good"}
        />
        <Metric
          label="Active alerts"
          value={dashboard.metrics.activeAlerts}
          detail={dashboard.metrics.activeAlerts === 0 ? "Nothing needs action" : "Review failures below"}
          tone={dashboard.metrics.activeAlerts === 0 ? "good" : "warning"}
        />
      </section>

      <section className="panel registrarPanel">
        <PanelHeading
          eyebrow="Registrar work queue"
          title="Student requests"
          detail={`${dashboard.metrics.pendingRegistrarRequests} waiting for review`}
        />
        <div className="panelActionRow">
          <span>Review student details and send status updates through Messenger.</span>
          <Link href="/registrar">Open Registrar workspace →</Link>
        </div>
        {dashboard.registrarRequests.length === 0 ? (
          <EmptyState title="No Registrar requests yet" detail="Confirmed document and appointment requests from Messenger will appear here with a reference number." />
        ) : (
          <div className="requestList">
            {dashboard.registrarRequests.map((request) => (
              <article className="requestItem" key={request.id}>
                <span className={`requestKind ${request.kind === "APPOINTMENT" ? "appointmentKind" : "documentKind"}`} aria-hidden="true">
                  {request.kind === "APPOINTMENT" ? "A" : "D"}
                </span>
                <div className="requestMain">
                  <div><strong>{request.kind === "DOCUMENT" ? request.documentType ?? "Document request" : request.appointmentPurpose ?? "Registrar appointment"}</strong><span>{request.referenceNumber}</span></div>
                  <p>{request.participant}{request.preferredSchedule ? ` · Preferred: ${request.preferredSchedule}` : ""}</p>
                </div>
                <div className="requestStatus">
                  <span>{friendlyRequestStatus(request.status)}</span>
                  <time>{formatRelative(request.submittedAt ?? request.createdAt)}</time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="dashboardGrid">
        <section className="panel conversationsPanel">
          <PanelHeading
            eyebrow="Latest activity"
            title="Student conversations"
            detail={`${dashboard.conversations.length} recent thread${dashboard.conversations.length === 1 ? "" : "s"}`}
          />
          {dashboard.conversations.length === 0 ? (
            <EmptyState title="No conversations yet" detail="Send the Page a Messenger message and it will appear here." />
          ) : (
            <div className="conversationList">
              {dashboard.conversations.map((conversation) => (
                <article className="conversation" key={conversation.id}>
                  <div className="conversationHead">
                    <div className="visitorAvatar" aria-hidden="true">M</div>
                    <div>
                      <h3>{conversation.participant}</h3>
                      <p>{conversation.channel} · {formatRelative(conversation.updatedAt)}</p>
                    </div>
                    <span className="openPill">{conversation.status}</span>
                  </div>
                  <div className="messageThread">
                    {conversation.messages.map((message) => (
                      <div className={`message ${message.senderKind === "AI" ? "aiMessage" : "studentMessage"}`} key={message.id}>
                        <span>{message.senderKind === "AI" ? "Luca" : "Student"}</span>
                        <p>{message.content}</p>
                        {getCitationTitles(message.citations).length > 0 ? (
                          <small>Used: {getCitationTitles(message.citations).join(", ")}</small>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="sideColumn">
          <section className="panel alertPanel">
            <PanelHeading eyebrow="Action queue" title="Alerts" detail={`${dashboard.metrics.activeAlerts} active`} />
            {dashboard.alerts.length === 0 ? (
              <div className="allClear">
                <span className="checkMark" aria-hidden="true">✓</span>
                <div><strong>All clear</strong><p>No webhook or reply-delivery failures.</p></div>
              </div>
            ) : (
              <div className="alertList">
                {dashboard.alerts.map((alert) => (
                  <article className="alertItem" key={`${alert.kind}-${alert.id}`}>
                    <span className="alertIcon" aria-hidden="true">!</span>
                    <div>
                      <strong>{alert.kind} failed</strong>
                      <p>{alert.lastErrorCode ?? alert.status}</p>
                      <small>{formatRelative(alert.occurredAt)} · {alert.attempts} attempt{alert.attempts === 1 ? "" : "s"}</small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel knowledgePanel">
            <PanelHeading eyebrow="Supabase source" title="Published knowledge" detail={`${dashboard.metrics.publishedKnowledge} version${dashboard.metrics.publishedKnowledge === 1 ? "" : "s"}`} />
            <div className="compactList">
              {dashboard.knowledge.map((item) => (
                <article key={item.id}>
                  <span className="documentIcon" aria-hidden="true">K</span>
                  <div><strong>{item.document.title}</strong><p>Version {item.version} · {item.status.toLowerCase()}</p></div>
                </article>
              ))}
              {dashboard.knowledge.length === 0 ? <p className="mutedText">No published knowledge yet.</p> : null}
            </div>
          </section>
        </aside>
      </div>

      <div className="lowerGrid">
        <section className="panel rulesPanel">
          <PanelHeading eyebrow="Bot behavior" title="Chatbot rules" detail={`${dashboard.metrics.activeRules} active`} />
          <div className="rulesList">
            {dashboard.rules.map((rule) => (
              <article key={rule.id}>
                <div className="ruleNumber">{rule.priority}</div>
                <div><h3>{rule.name}</h3><p>{rule.instructions}</p></div>
                <span className={rule.active ? "activePill" : "inactivePill"}>{rule.active ? "Active" : "Off"}</span>
              </article>
            ))}
            {dashboard.rules.length === 0 ? <EmptyState title="No chatbot rules" detail="Add rules in Supabase before allowing public use." /> : null}
          </div>
        </section>

        <section className="panel aiPanel">
          <PanelHeading eyebrow="AI activity" title="Recent answer runs" detail={dashboard.aiRuns[0]?.model ?? "No model used yet"} />
          <div className="runList">
            {dashboard.aiRuns.map((run) => (
              <article key={run.id}>
                <span className={`runDot ${run.outcome === "SUCCEEDED" ? "success" : run.outcome === "FAILED" ? "failed" : "working"}`} />
                <div>
                  <strong>{friendlyOutcome(run.outcome)}</strong>
                  <p>{run.model} · {countKnowledgeIds(run.knowledgeVersionIds)} knowledge source{countKnowledgeIds(run.knowledgeVersionIds) === 1 ? "" : "s"}</p>
                </div>
                <time>{formatRelative(run.createdAt)}</time>
              </article>
            ))}
            {dashboard.aiRuns.length === 0 ? <p className="mutedText">No AI answers generated yet.</p> : null}
          </div>
        </section>
      </div>

      <footer>
        <span>Luca Messenger Operations</span>
        <span>Supabase is the source of truth · Registrar actions are audited</span>
      </footer>
    </main>
  );
}

function Metric({ label, value, detail, tone = "neutral" }: { label: string; value: string | number; detail: string; tone?: "neutral" | "good" | "warning" }) {
  return <article className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>;
}

function PanelHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <div className="panelHeading"><div><p>{eyebrow}</p><h2>{title}</h2></div><span>{detail}</span></div>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="emptyState"><strong>{title}</strong><p>{detail}</p></div>;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(value));
}

function formatRelative(value: string): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

function getCitationTitles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => typeof item === "object" && item !== null && "title" in item && typeof item.title === "string" ? [item.title] : []);
}

function countKnowledgeIds(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function friendlyOutcome(outcome: string): string {
  if (outcome === "SUCCEEDED") return "Answer delivered";
  if (outcome === "FAILED") return "Answer failed";
  return "Answer processing";
}

function friendlyRequestStatus(status: string): string {
  return status.toLowerCase().replaceAll("_", " ");
}
