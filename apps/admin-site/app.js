const runtimeApiBaseUrl = window.LUCA_CONFIG?.apiBaseUrl ?? "";
const storageKey = "luca.apiBaseUrl";

const cases = [
  {
    id: "registration-hold",
    initials: "AJ",
    tone: "violet",
    name: "Alex J.",
    fullName: "Alex Johnson",
    preview: "Why is my registration hold still active?",
    time: "Now",
    category: "Registration hold",
    risk: "Review",
    riskTone: "amber-tag",
    identity: "Unverified",
    priority: "Normal",
    assigned: true,
    needsReview: true,
    knowledge: "Registration holds guide",
    knowledgeStatus: "Demo source only",
    messages: [
      { kind: "student", text: "Hi, my registration hold is still active. I already submitted the missing form yesterday.", time: "10:42 AM" },
      { kind: "agent", text: "I can explain the usual next steps. I cannot view or change your academic record here, so a Registration staff member will need to check the hold status.", time: "10:42 AM" },
      { kind: "student", text: "Can you tell me whether I can still enroll today?", time: "10:43 AM" },
      { kind: "agent", text: "Please keep your confirmation receipt available for Registration. I am marking this for staff review so they can confirm your enrollment eligibility.", citation: "Registration holds guide - demo citation", time: "10:43 AM" }
    ]
  },
  {
    id: "add-drop",
    initials: "KM",
    tone: "blue",
    name: "Kian M.",
    fullName: "Kian Morales",
    preview: "Can I still add a subject this week?",
    time: "6m",
    category: "Add or drop",
    risk: "Low",
    riskTone: "green-tag",
    identity: "Unverified",
    priority: "Normal",
    assigned: true,
    needsReview: false,
    knowledge: "Add and drop schedule",
    knowledgeStatus: "Demo source only",
    messages: [
      { kind: "student", text: "Can I still add a subject this week?", time: "10:36 AM" },
      { kind: "agent", text: "I can share the published add and drop schedule. A Registration staff member must confirm requests that change your enrollment.", citation: "Add and drop schedule - demo citation", time: "10:36 AM" }
    ]
  },
  {
    id: "requirements",
    initials: "SR",
    tone: "coral",
    name: "Sofia R.",
    fullName: "Sofia Reyes",
    preview: "Which documents are required for late registration?",
    time: "11m",
    category: "Requirements",
    risk: "Low",
    riskTone: "green-tag",
    identity: "Unverified",
    priority: "Low",
    assigned: false,
    needsReview: false,
    knowledge: "Late registration checklist",
    knowledgeStatus: "Demo source only",
    messages: [
      { kind: "student", text: "Which documents are required for late registration?", time: "10:31 AM" },
      { kind: "agent", text: "The checklist can vary by program. I can point you to the approved guidance once Registration publishes it for this term.", time: "10:31 AM" }
    ]
  },
  {
    id: "enrollment-certificate",
    initials: "DN",
    tone: "teal",
    name: "Diego N.",
    fullName: "Diego Navarro",
    preview: "Where can I request an enrollment certificate?",
    time: "18m",
    category: "Documents",
    risk: "Low",
    riskTone: "green-tag",
    identity: "Unverified",
    priority: "Low",
    assigned: false,
    needsReview: false,
    knowledge: "Enrollment document guide",
    knowledgeStatus: "Demo source only",
    messages: [
      { kind: "student", text: "Where can I request an enrollment certificate?", time: "10:24 AM" },
      { kind: "agent", text: "I can provide general request guidance. A secure university process is required before anyone can release a document containing your student record.", time: "10:24 AM" }
    ]
  }
];

let selectedCaseId = cases[0].id;
let activeFilter = "all";
let apiBaseUrl = readStoredApiBaseUrl() || normalizeApiBaseUrl(runtimeApiBaseUrl);
let toastTimeout;

const caseList = document.querySelector("#caseList");
const chatHeading = document.querySelector("#chatHeading");
const messages = document.querySelector("#messages");
const agentSteps = document.querySelector("#agentSteps");
const caseContext = document.querySelector("#caseContext");
const apiStatus = document.querySelector("#apiStatus");
const apiStatusText = document.querySelector("#apiStatusText");
const connectionSummary = document.querySelector("#connectionSummary");
const connectionDetail = document.querySelector("#connectionDetail");
const apiDialog = document.querySelector("#apiDialog");
const newCaseDialog = document.querySelector("#newCaseDialog");
const apiBaseUrlInput = document.querySelector("#apiBaseUrl");
const apiError = document.querySelector("#apiError");
const chatInput = document.querySelector("#chatInput");
const toast = document.querySelector("#toast");

function currentCase() {
  return cases.find((item) => item.id === selectedCaseId) ?? cases[0];
}

function renderWorkspace() {
  const selected = currentCase();
  const visibleCases = cases.filter(matchesFilter);
  caseList.innerHTML = visibleCases.map(renderCase).join("");
  chatHeading.innerHTML = `
    <div class="student-title">
      <span class="avatar ${selected.tone}">${selected.initials}</span>
      <div><h2>${escapeHtml(selected.fullName)}</h2><p><span class="online-dot"></span> Messenger demo - student identity unverified</p></div>
    </div>
    <button class="icon-button compact" type="button" title="Conversation options" aria-label="Conversation options"><i data-lucide="ellipsis" aria-hidden="true"></i></button>`;
  messages.innerHTML = selected.messages.map(renderMessage).join("");
  agentSteps.innerHTML = renderSteps(selected);
  caseContext.innerHTML = `
    <div><dt>Category</dt><dd><span class="tag">${escapeHtml(selected.category)}</span></dd></div>
    <div><dt>Risk level</dt><dd><span class="tag ${selected.riskTone}">${escapeHtml(selected.risk)}</span></dd></div>
    <div><dt>Identity</dt><dd>${escapeHtml(selected.identity)}</dd></div>
    <div><dt>Suggested priority</dt><dd>${escapeHtml(selected.priority)}</dd></div>`;
  document.querySelector("#knowledgeTitle").textContent = selected.knowledge;
  document.querySelector("#knowledgeStatus").textContent = selected.knowledgeStatus;
  updateCounts();
  bindCaseButtons();
  refreshIcons();
  messages.scrollTop = messages.scrollHeight;
}

function matchesFilter(item) {
  if (activeFilter === "assigned") return item.assigned;
  if (activeFilter === "review") return item.needsReview;
  return true;
}

function renderCase(item) {
  const activeClass = item.id === selectedCaseId ? " active-case" : "";
  return `<button class="case${activeClass}" type="button" data-case-id="${item.id}"><span class="avatar ${item.tone}">${item.initials}</span><span class="case-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.preview)}</small></span><time>${item.time}</time></button>`;
}

function renderMessage(message) {
  if (message.kind === "student") {
    return `<div class="message-row student"><div class="avatar ${currentCase().tone}">${currentCase().initials}</div><div><div class="bubble">${escapeHtml(message.text)}</div><time>${message.time}</time></div></div>`;
  }
  const citation = message.citation ? `<div class="citation"><i data-lucide="book-open-check" aria-hidden="true"></i><span>${escapeHtml(message.citation)}</span></div>` : "";
  return `<div class="message-row agent"><div class="avatar luca-avatar">L</div><div><p class="sender">Luca <span>Registration assistant</span></p><div class="bubble">${escapeHtml(message.text)}</div>${citation}<time>${message.time}</time></div></div>`;
}

function renderSteps(item) {
  const lastStep = item.needsReview
    ? ["waiting", "Staff review needed", "Record-specific confirmation is outside this chat"]
    : ["done", "Waiting for student", "Escalate only if the published guidance is insufficient"];
  return `
    <li class="done"><span><i data-lucide="check" aria-hidden="true"></i></span><div><strong>Classified request</strong><p>${escapeHtml(item.category)} - Registration</p></div><time>Now</time></li>
    <li class="done"><span><i data-lucide="check" aria-hidden="true"></i></span><div><strong>Checked safety policy</strong><p>Identity remains unverified</p></div><time>Now</time></li>
    <li class="done"><span><i data-lucide="check" aria-hidden="true"></i></span><div><strong>Prepared staff route</strong><p>Registration owns the next decision</p></div><time>Now</time></li>
    <li class="${lastStep[0]}"><span><i data-lucide="${lastStep[0] === "done" ? "check" : "clock-3"}" aria-hidden="true"></i></span><div><strong>${lastStep[1]}</strong><p>${lastStep[2]}</p></div></li>`;
}

function bindCaseButtons() {
  document.querySelectorAll("[data-case-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCaseId = button.dataset.caseId;
      renderWorkspace();
    });
  });
}

function updateCounts() {
  const reviewCount = cases.filter((item) => item.needsReview).length;
  const count = String(cases.length);
  document.querySelector("#openCaseCount").textContent = count;
  document.querySelector("#navCaseCount").textContent = count;
  document.querySelector("#allFilterCount").textContent = count;
  document.querySelector("#reviewCaseCount").textContent = String(reviewCount);
  document.querySelector("#reviewFilterCount").textContent = String(reviewCount);
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function openApiDialog() {
  apiError.textContent = "";
  apiBaseUrlInput.value = apiBaseUrl;
  apiDialog.showModal();
  apiBaseUrlInput.focus();
}

function openNewCaseDialog() {
  newCaseDialog.showModal();
  document.querySelector("#requestName").focus();
}

function setApiStatus(state, summary, detail) {
  apiStatus.dataset.state = state;
  apiStatusText.textContent = summary;
  connectionSummary.textContent = summary;
  connectionDetail.textContent = detail;
}

async function checkApiConnection() {
  if (!apiBaseUrl) {
    setApiStatus("idle", "API not configured", "Add the deployed public API URL to run live health checks.");
    return;
  }

  setApiStatus("checking", "Checking API", apiBaseUrl);
  try {
    const health = await requestJson("/health");
    if (health.payload?.status !== "OPERATIONAL") throw new Error("Health response is not operational");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Connection failed";
    setApiStatus("error", "API unavailable", detail);
    return;
  }

  try {
    const readiness = await requestJson("/ready", { allowNonSuccess: true, timeoutMs: 2500 });
    if (readiness.ok && readiness.payload?.status === "READY") {
      setApiStatus("ready", "API ready", `${apiBaseUrl} - database and queue checks are up.`);
    } else {
      setApiStatus("operational", "API reachable", `${apiBaseUrl} - dependency readiness is not yet complete.`);
    }
  } catch {
    setApiStatus("operational", "API reachable", `${apiBaseUrl} - readiness check is unavailable.`);
  }
}

async function requestJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 6000);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    const payload = await response.json().catch(() => undefined);
    if (!response.ok && !options.allowNonSuccess) throw new Error(`API returned ${response.status}`);
    return { ok: response.ok, payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("API request timed out", { cause: error });
    }
    if (error instanceof TypeError) {
      throw new Error("Browser could not reach the API. Check its URL and CORS origin.", { cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeApiBaseUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    const localHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !localHttp) return "";
    return trimmed;
  } catch {
    return "";
  }
}

function readStoredApiBaseUrl() {
  try {
    return normalizeApiBaseUrl(window.localStorage.getItem(storageKey) ?? "");
  } catch {
    return "";
  }
}

function saveApiBaseUrl(value) {
  try {
    if (value) window.localStorage.setItem(storageKey, value);
    else window.localStorage.removeItem(storageKey);
  } catch {
    // The page remains usable when storage is unavailable.
  }
}

function showToast(message) {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 4500);
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
    renderWorkspace();
  });
});

document.querySelector("#apiSettingsButton").addEventListener("click", openApiDialog);
document.querySelector("#closeApiDialog").addEventListener("click", () => apiDialog.close());
document.querySelector("#clearApiButton").addEventListener("click", () => {
  apiBaseUrl = "";
  saveApiBaseUrl("");
  apiBaseUrlInput.value = "";
  apiError.textContent = "";
  apiDialog.close();
  checkApiConnection();
});
document.querySelector("#refreshApiButton").addEventListener("click", checkApiConnection);

document.querySelector("#apiSettingsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const candidate = normalizeApiBaseUrl(apiBaseUrlInput.value);
  if (!candidate) {
    apiError.textContent = "Enter an HTTPS URL, or use http://localhost for local testing.";
    return;
  }
  apiBaseUrl = candidate;
  saveApiBaseUrl(candidate);
  apiDialog.close();
  await checkApiConnection();
});

document.querySelector("#newCaseButton").addEventListener("click", openNewCaseDialog);
document.querySelector("#closeNewCaseDialog").addEventListener("click", () => newCaseDialog.close());
document.querySelector("#cancelNewCaseButton").addEventListener("click", () => newCaseDialog.close());
document.querySelector("#newCaseForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const nameInput = document.querySelector("#requestName");
  const textInput = document.querySelector("#requestText");
  const name = nameInput.value.trim();
  const text = textInput.value.trim();
  if (!name || !text) return;
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const draft = {
    id: `draft-${Date.now()}`,
    initials: initials || "ST",
    tone: "teal",
    name,
    fullName: name,
    preview: text,
    time: "Now",
    category: "Registration inquiry",
    risk: "Low",
    riskTone: "green-tag",
    identity: "Unverified",
    priority: "Normal",
    assigned: false,
    needsReview: false,
    knowledge: "No production source selected",
    knowledgeStatus: "Local draft only",
    messages: [{ kind: "student", text, time: "Now" }]
  };
  cases.unshift(draft);
  selectedCaseId = draft.id;
  activeFilter = "all";
  document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item.dataset.filter === "all"));
  nameInput.value = "";
  textInput.value = "";
  newCaseDialog.close();
  renderWorkspace();
  showToast("Local prototype request created. No data was sent to a university system.");
});

document.querySelector("#chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  const selected = currentCase();
  selected.messages.push({ kind: "student", text, time: "Now" });
  selected.messages.push({ kind: "agent", text: "This prototype saved your message in the browser only. A production Messenger and ticket endpoint is not deployed yet.", time: "Now" });
  chatInput.value = "";
  renderWorkspace();
  showToast("Message saved locally. Production delivery is not enabled.");
});

document.querySelector("#escalateButton").addEventListener("click", () => {
  const selected = currentCase();
  selected.needsReview = true;
  selected.risk = "Review";
  selected.riskTone = "amber-tag";
  renderWorkspace();
  showToast("Escalation marked locally. Staff routing API is not deployed yet.");
});

renderWorkspace();
checkApiConnection();
refreshIcons();
