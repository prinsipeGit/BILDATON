import { describe, expect, it } from "vitest";
import { decideStudentAnswer, type KnowledgeCandidate } from "./index.js";

const candidate: KnowledgeCandidate = {
  documentId: "document-1",
  documentVersionId: "version-1",
  chunkId: "chunk-1",
  title: "Registration deadlines",
  content: "Approved public deadline guidance.",
  effectiveFrom: new Date("2026-01-01"),
  effectiveTo: new Date("2026-12-31")
};

describe("student RAG policy", () => {
  it("allows a cited answer only from effective sources", () => {
    expect(
      decideStudentAnswer(
        {
          query: "When does add/drop end?",
          requestedAt: new Date("2026-07-18"),
          containsSensitiveData: false,
          requiresRecordChange: false,
          requiresVerifiedIdentity: false,
          isUncertain: false
        },
        [candidate]
      )
    ).toEqual({ kind: "ANSWER", citations: [candidate] });
  });

  it("escalates student-specific requests before model use", () => {
    expect(
      decideStudentAnswer(
        {
          query: "Why is my account on hold?",
          requestedAt: new Date("2026-07-18"),
          containsSensitiveData: false,
          requiresRecordChange: false,
          requiresVerifiedIdentity: true,
          isUncertain: false
        },
        [candidate]
      )
    ).toEqual({ kind: "ESCALATE", reason: "SENSITIVE_OR_PERSONAL" });
  });
});
