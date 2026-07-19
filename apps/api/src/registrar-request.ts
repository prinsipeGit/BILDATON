import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@luca/database";

const AWAITING_DOCUMENT_TYPE = "AWAITING_DOCUMENT_TYPE";
const AWAITING_STUDENT_DETAILS = "AWAITING_STUDENT_DETAILS";
const AWAITING_STUDENT_LAST_NAME = "AWAITING_STUDENT_LAST_NAME";
const AWAITING_STUDENT_ID = "AWAITING_STUDENT_ID";
const AWAITING_STUDENT_EMAIL = "AWAITING_STUDENT_EMAIL";
const AWAITING_APPOINTMENT_PURPOSE = "AWAITING_APPOINTMENT_PURPOSE";
const AWAITING_APPOINTMENT_SCHEDULE = "AWAITING_APPOINTMENT_SCHEDULE";
const AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION";
const COMPLETE = "COMPLETE";

export interface RegistrarWorkflowReply {
  requestId: string;
  text: string;
}

interface RegistrarRequestInput {
  institutionId: string;
  conversationId: string;
  messengerIdentityId: string;
  text: string;
}

export async function processRegistrarRequest(
  prisma: PrismaClient,
  input: RegistrarRequestInput
): Promise<RegistrarWorkflowReply | null> {
  const pending = await prisma.registrarRequest.findFirst({
    where: { conversationId: input.conversationId, status: "DRAFT" },
    orderBy: { createdAt: "desc" }
  });

  if (pending) {
    if (isCancellation(input.text)) {
      const cancelled = await prisma.registrarRequest.update({
        where: { id: pending.id },
        data: { status: "CANCELLED", currentStep: COMPLETE }
      });
      return {
        requestId: cancelled.id,
        text: "No problem—I cancelled that draft request. Nothing was submitted to the Registrar. What else can I help you with?"
      };
    }

    if (pending.kind === "DOCUMENT") {
      if (!pending.documentType && pending.currentStep !== AWAITING_DOCUMENT_TYPE) {
        const updated = await prisma.registrarRequest.update({
          where: { id: pending.id },
          data: { currentStep: AWAITING_DOCUMENT_TYPE }
        });
        return { requestId: updated.id, text: askForDocumentType() };
      }

      if (pending.currentStep === AWAITING_DOCUMENT_TYPE) {
        const documentType = cleanStudentAnswer(input.text);
        if (documentType.length < 3) {
          return { requestId: pending.id, text: "Please type the full name of the document you want to request." };
        }
        const updated = await prisma.registrarRequest.update({
          where: { id: pending.id },
          data: { documentType, currentStep: AWAITING_STUDENT_DETAILS }
        });
        return { requestId: updated.id, text: askForStudentDetails(documentType) };
      }

      if (pending.currentStep === AWAITING_STUDENT_DETAILS) {
        const details = parseStudentDetails(input.text);
        const validationMessage = validateStudentDetails(details);
        if (validationMessage) {
          return {
            requestId: pending.id,
            text: `${validationMessage}\n\n${studentDetailsFormat()}`
          };
        }
        const updated = await prisma.registrarRequest.update({
          where: { id: pending.id },
          data: {
            studentLastName: details.lastName,
            studentIdNumber: details.studentId,
            studentEmail: details.email,
            currentStep: AWAITING_CONFIRMATION
          }
        });
        return { requestId: updated.id, text: documentConfirmation(updated) };
      }

      if (!pending.studentLastName && pending.currentStep !== AWAITING_STUDENT_LAST_NAME) {
        const updated = await prisma.registrarRequest.update({
          where: { id: pending.id },
          data: { currentStep: AWAITING_STUDENT_DETAILS }
        });
        return { requestId: updated.id, text: askForStudentDetails(pending.documentType ?? "document") };
      }

      if (pending.currentStep === AWAITING_STUDENT_LAST_NAME) {
        const lastName = cleanStudentAnswer(input.text);
        if (!isValidLastName(lastName)) {
          return {
            requestId: pending.id,
            text: "That last name does not look valid. Please enter the student’s last name only, using letters, spaces, apostrophes, or hyphens."
          };
        }
        const updated = await prisma.registrarRequest.update({
          where: { id: pending.id },
          data: { studentLastName: lastName, currentStep: AWAITING_STUDENT_ID }
        });
        return {
          requestId: updated.id,
          text: "Thanks. Please enter the student’s 6-digit ID number using numbers only. Example: 123456"
        };
      }

      if (!pending.studentIdNumber && pending.currentStep !== AWAITING_STUDENT_ID) {
        const updated = await prisma.registrarRequest.update({
          where: { id: pending.id },
          data: { currentStep: AWAITING_STUDENT_ID }
        });
        return { requestId: updated.id, text: "Please enter the student’s 6-digit ID number using numbers only. Example: 123456" };
      }

      if (pending.currentStep === AWAITING_STUDENT_ID) {
        const studentIdNumber = input.text.trim();
        if (!isValidStudentId(studentIdNumber)) {
          return { requestId: pending.id, text: "The student ID must contain exactly 6 digits. Please try again, for example: 123456" };
        }
        const updated = await prisma.registrarRequest.update({
          where: { id: pending.id },
          data: { studentIdNumber, currentStep: AWAITING_STUDENT_EMAIL }
        });
        return {
          requestId: updated.id,
          text: "What email address should the Registrar use for updates about this request?"
        };
      }

      if (!pending.studentEmail && pending.currentStep !== AWAITING_STUDENT_EMAIL) {
        const updated = await prisma.registrarRequest.update({
          where: { id: pending.id },
          data: { currentStep: AWAITING_STUDENT_EMAIL }
        });
        return { requestId: updated.id, text: "What email address should the Registrar use for updates about this request?" };
      }

      if (pending.currentStep === AWAITING_STUDENT_EMAIL) {
        const studentEmail = input.text.trim().toLowerCase();
        if (!isValidEmail(studentEmail)) {
          return { requestId: pending.id, text: "That email address does not look valid. Please enter it again, for example: student@example.com" };
        }
        const updated = await prisma.registrarRequest.update({
          where: { id: pending.id },
          data: { studentEmail, currentStep: AWAITING_CONFIRMATION }
        });
        return { requestId: updated.id, text: documentConfirmation(updated) };
      }
    }

    if (pending.kind === "APPOINTMENT" && pending.currentStep === AWAITING_APPOINTMENT_PURPOSE) {
      const purpose = cleanStudentAnswer(input.text);
      const updated = await prisma.registrarRequest.update({
        where: { id: pending.id },
        data: { appointmentPurpose: purpose, currentStep: AWAITING_APPOINTMENT_SCHEDULE }
      });
      return {
        requestId: updated.id,
        text: "Thanks. What date and time would you prefer for the Registrar appointment? You can type something like “July 22 at 10:00 AM.” This is a preference, not a confirmed schedule yet."
      };
    }

    if (pending.kind === "APPOINTMENT" && pending.currentStep === AWAITING_APPOINTMENT_SCHEDULE) {
      const preferredSchedule = cleanStudentAnswer(input.text);
      const updated = await prisma.registrarRequest.update({
        where: { id: pending.id },
        data: { preferredSchedule, currentStep: AWAITING_CONFIRMATION }
      });
      return {
        requestId: updated.id,
        text: appointmentConfirmation(updated.appointmentPurpose ?? "Registrar assistance", preferredSchedule)
      };
    }

    if (pending.currentStep === AWAITING_CONFIRMATION) {
      if (!isConfirmation(input.text)) {
        return {
          requestId: pending.id,
          text: "Please reply CONFIRM to submit this request for Registrar review, or CANCEL to discard it."
        };
      }
      const submitted = await prisma.registrarRequest.update({
        where: { id: pending.id },
        data: { status: "SUBMITTED", currentStep: COMPLETE, submittedAt: new Date() }
      });
      return { requestId: submitted.id, text: submittedMessage(submitted.referenceNumber, submitted.kind) };
    }
  }

  const intent = detectRegistrarIntent(input.text);
  if (!intent) return null;

  const referenceNumber = createReferenceNumber();
  if (intent.kind === "DOCUMENT") {
    const request = await prisma.registrarRequest.create({
      data: {
        institutionId: input.institutionId,
        conversationId: input.conversationId,
        messengerIdentityId: input.messengerIdentityId,
        referenceNumber,
        kind: "DOCUMENT",
        currentStep: intent.documentType ? AWAITING_STUDENT_DETAILS : AWAITING_DOCUMENT_TYPE,
        documentType: intent.documentType
      }
    });
    return {
      requestId: request.id,
      text: intent.documentType
        ? askForStudentDetails(intent.documentType)
        : askForDocumentType()
    };
  }

  const request = await prisma.registrarRequest.create({
    data: {
      institutionId: input.institutionId,
      conversationId: input.conversationId,
      messengerIdentityId: input.messengerIdentityId,
      referenceNumber,
      kind: "APPOINTMENT",
      currentStep: AWAITING_APPOINTMENT_PURPOSE
    }
  });
  return {
    requestId: request.id,
    text: "I can start an appointment request with the Registrar. What do you need help with during the appointment? Please give a short reason."
  };
}

export function detectRegistrarIntent(
  text: string
): { kind: "DOCUMENT"; documentType: string | null } | { kind: "APPOINTMENT" } | null {
  const normalized = text.toLowerCase();
  const actionIntent = /\b(i need|i want|i would like|can i (?:get|request|apply|schedule|book)|request|apply|obtain|order|schedule|book|set|make)\b/.test(normalized);
  const appointment = /\b(appointment|meeting|visit)\b/.test(normalized) && /\b(registrar|records office|schedule|book|set|make)\b/.test(normalized);
  if (actionIntent && appointment) return { kind: "APPOINTMENT" };

  const document = /\b(transcript|tor|diploma|certificate|good moral|academic record|school record|document)\b/.test(normalized);
  if (!actionIntent || !document) return null;
  return { kind: "DOCUMENT", documentType: extractDocumentType(normalized) };
}

function extractDocumentType(text: string): string | null {
  if (/\b(transcript of records|transcript|tor)\b/.test(text)) return "Transcript of Records";
  if (/\bcertificate of enrollment|enrollment certificate\b/.test(text)) return "Certificate of Enrollment";
  if (/\bcertificate of grades|grade certificate\b/.test(text)) return "Certificate of Grades";
  if (/\bgood moral\b/.test(text)) return "Certificate of Good Moral Character";
  if (/\bdiploma\b/.test(text)) return "Diploma";
  return null;
}

function askForDocumentType(): string {
  return [
    "I can help you create a document request for Registrar staff review.",
    "Which document do you need? Please type its full name, such as “Transcript of Records.”"
  ].join("\n\n");
}

function askForStudentDetails(documentType: string): string {
  return [
    `I can help you submit a ${documentType} request for Registrar staff review.`,
    "Please send these three student details in one message:",
    studentDetailsFormat(),
    "I’ll show you a summary and ask for confirmation before submitting."
  ].join("\n\n");
}

function studentDetailsFormat(): string {
  return [
    "Last name: Dela Cruz",
    "Student ID: 123456",
    "Email: student@example.com"
  ].join("\n");
}

export function parseStudentDetails(text: string): {
  lastName: string;
  studentId: string;
  email: string;
} {
  const values = { lastName: "", studentId: "", email: "" };
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const labeled = line.match(/^(?:\d+[.)]\s*)?(last\s*name|student\s*id|id|email(?:\s*address)?)\s*[:=-]\s*(.+)$/i);
    if (!labeled) continue;
    const label = labeled[1]!.toLowerCase().replace(/\s+/g, " ");
    const value = labeled[2]!.trim();
    if (label === "last name") values.lastName = value;
    else if (label === "student id" || label === "id") values.studentId = value;
    else values.email = value;
  }

  if (!values.lastName && !values.studentId && !values.email && lines.length === 3) {
    const orderedValues = lines.map((line) =>
      line.replace(/^\d+[.)]\s*/, "").trim()
    );
    values.lastName = orderedValues[0]!;
    values.studentId = orderedValues[1]!;
    values.email = orderedValues[2]!;
  }

  return {
    lastName: cleanStudentAnswer(values.lastName),
    studentId: values.studentId.trim(),
    email: values.email.trim().toLowerCase()
  };
}

function validateStudentDetails(details: ReturnType<typeof parseStudentDetails>): string | null {
  const problems: string[] = [];
  if (!isValidLastName(details.lastName)) problems.push("a valid last name");
  if (!isValidStudentId(details.studentId)) problems.push("a 6-digit student ID");
  if (!isValidEmail(details.email)) problems.push("a valid email address");
  if (problems.length === 0) return null;
  return `I couldn’t read ${formatList(problems)}. Please send all three details again in this format:`;
}

function formatList(items: string[]): string {
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function documentConfirmation(request: {
  documentType: string | null;
  studentLastName: string | null;
  studentIdNumber: string | null;
  studentEmail: string | null;
}): string {
  return [
    "Please review the Registrar document request:",
    [
      `Document: ${request.documentType ?? "Not provided"}`,
      `Last name: ${request.studentLastName ?? "Not provided"}`,
      `Student ID: ${request.studentIdNumber ?? "Not provided"}`,
      `Email: ${request.studentEmail ?? "Not provided"}`
    ].join("\n"),
    "Submitting creates a staff-review request; it does not approve or release the document yet.",
    "Reply CONFIRM to submit, or CANCEL to discard it."
  ].join("\n\n");
}

function appointmentConfirmation(purpose: string, schedule: string): string {
  return [
    "Please review your appointment request:",
    `Reason: ${purpose}\nPreferred schedule: ${schedule}`,
    "The schedule is not confirmed until Registrar staff approves it. Reply CONFIRM to submit, or CANCEL to stop."
  ].join("\n\n");
}

function submittedMessage(referenceNumber: string, kind: "DOCUMENT" | "APPOINTMENT"): string {
  const label = kind === "DOCUMENT" ? "document" : "appointment";
  return [
    `Your Registrar ${label} request has been submitted.`,
    `Reference: ${referenceNumber}`,
    "Registrar staff will review it and follow up through Messenger if they need verification or more information. Please keep your reference number."
  ].join("\n\n");
}

function cleanStudentAnswer(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, 240);
}

export function isValidLastName(value: string): boolean {
  return /^[\p{L}][\p{L}'’ -]{1,79}$/u.test(value.trim());
}

export function isValidStudentId(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function isConfirmation(text: string): boolean {
  return /^(confirm|yes|yes,? submit|submit|go ahead|proceed)[.!]?$/i.test(text.trim());
}

function isCancellation(text: string): boolean {
  return /^(cancel|stop|never mind|nevermind)[.!]?$/i.test(text.trim());
}

function createReferenceNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `REG-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}
