import { describe, expect, it } from "vitest";
import {
  AuthorizationError,
  canServePublicFaq,
  requireVerifiedOrganizationOfficer,
  requireVerifiedStudentAccess
} from "./index.js";

describe("department activation", () => {
  it("requires an active department, source owner, and routing destination", () => {
    expect(
      canServePublicFaq({
        status: "ACTIVE",
        publicFaqEnabled: true,
        sourceOwnerUserId: "owner-1",
        routingDestination: "registration-queue"
      })
    ).toBe(true);
    expect(
      canServePublicFaq({
        status: "READY",
        publicFaqEnabled: true,
        sourceOwnerUserId: "owner-1",
        routingDestination: "registration-queue"
      })
    ).toBe(false);
  });
});

describe("student verification", () => {
  it("rejects expired or revoked access", () => {
    expect(() =>
      requireVerifiedStudentAccess(
        { studentId: "student-1", expiresAt: new Date("2026-01-01"), revokedAt: null },
        new Date("2026-07-18")
      )
    ).toThrow(AuthorizationError);
    expect(() => requireVerifiedOrganizationOfficer("student-1", null)).toThrow(AuthorizationError);
  });
});
