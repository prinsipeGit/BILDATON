const messages = document.querySelector("#messages");
const form = document.querySelector("#chatForm");
const input = document.querySelector("#chatInput");
const toast = document.querySelector("#toast");
const steps = document.querySelector("#agentSteps");

const responses = {
  password: {
    text: "A reset link expires after 15 minutes. Please request a new one from the sign-in page, then open only the most recent email. If it still expires, I’ll create an IT Support ticket for you.",
    activity: "Searched the approved password reset guide",
    detail: "1 current guide matched"
  },
  wifi: {
    text: "Try forgetting the LUCA-Student network, reconnecting, and signing in again with the campus portal. If the connection drops again, tell me the building and approximate time so IT can investigate.",
    activity: "Retrieved Wi‑Fi troubleshooting guide",
    detail: "Published knowledge · campus network"
  },
  printing: {
    text: "I can help narrow this down. Please check whether the job shows as paused in the print portal. Do not share your password or one-time code here. If it remains stuck, I’ll route it to IT Support.",
    activity: "Checked print queue guidance",
    detail: "Safe troubleshooting response drafted"
  },
  grade: {
    text: "Grade changes need review by your instructor or Registrar. I can create a ticket with a summary, but I can’t view or change academic records in chat.",
    activity: "Safety policy required human handoff",
    detail: "Academic-record request · escalation recommended"
  },
  default: {
    text: "I can help with general IT guidance or route your concern to the right team. Please describe what you are trying to do and the exact error you see—without sharing passwords or one-time codes.",
    activity: "Classified request and prepared a safe response",
    detail: "Waiting for more information"
  }
};

function pickResponse(text) {
  const value = text.toLowerCase();
  if (/grade|record|transcript|registrar/.test(value)) return responses.grade;
  if (/wifi|wi-fi|network|internet/.test(value)) return responses.wifi;
  if (/print|printer/.test(value)) return responses.printing;
  if (/password|reset|login|locked|account/.test(value)) return responses.password;
  return responses.default;
}

function timeNow() {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date());
}

function appendMessage(kind, text, response) {
  const row = document.createElement("div");
  row.className = `message-row ${kind}`;
  const isStudent = kind === "student";
  row.innerHTML = `${isStudent ? "" : '<div class="avatar luca-avatar">L</div>'}<div>${isStudent ? "" : '<p class="sender">Luca <span>AI support assistant</span></p>'}<div class="bubble"></div>${response ? '<div class="citation">◫ Based on <a href="#knowledge">approved support knowledge</a></div>' : ""}<time>${timeNow()}</time></div>${isStudent ? '<div class="avatar violet">AJ</div>' : ""}`;
  row.querySelector(".bubble").textContent = text;
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
}

function updateActivity(response) {
  const waiting = steps.querySelector(".waiting");
  if (waiting) waiting.remove();
  const item = document.createElement("li");
  item.className = "done";
  item.innerHTML = `<span>✓</span><div><strong>${response.activity}</strong><p>${response.detail}</p></div><time>${timeNow()}</time>`;
  steps.append(item);
  const next = document.createElement("li");
  next.className = "waiting";
  next.innerHTML = `<span>◌</span><div><strong>Waiting for Alex</strong><p>${response === responses.grade ? "Human review recommended" : "Escalate if unresolved"}</p></div>`;
  steps.append(next);
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  appendMessage("student", text);
  input.value = "";
  const response = pickResponse(text);
  window.setTimeout(() => {
    appendMessage("agent", response.text, response);
    updateActivity(response);
  }, 420);
});

document.querySelectorAll(".case").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".active-case")?.classList.remove("active-case");
    button.classList.add("active-case");
    const response = responses[button.dataset.case] ?? responses.default;
    appendMessage("agent", response.text, response);
    updateActivity(response);
  });
});

document.querySelector("#escalateButton").addEventListener("click", () => {
  const waiting = steps.querySelector(".waiting");
  if (waiting) {
    waiting.className = "done";
    waiting.innerHTML = `<span>✓</span><div><strong>IT Support ticket created</strong><p>Reference LUCA-IT-1042 · Staff review queued</p></div><time>${timeNow()}</time>`;
  }
  showToast("Prototype: IT Support ticket LUCA-IT-1042 created for staff review.");
});

document.querySelector("#newCaseButton").addEventListener("click", () => {
  showToast("Prototype: a new case form would open here.");
});
