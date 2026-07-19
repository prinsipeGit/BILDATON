import { describe, expect, it } from "vitest";
import {
  detectRegistrarIntent,
  isValidEmail,
  isValidLastName,
  isValidStudentId,
  parseStudentDetails
} from "./registrar-request.js";

describe("registrar request intent detection", () => {
  it("detects a transcript request", () => {
    expect(detectRegistrarIntent("I want to request my transcript of records")).toEqual({
      kind: "DOCUMENT",
      documentType: "Transcript of Records"
    });
  });

  it("detects an appointment request", () => {
    expect(detectRegistrarIntent("Can I schedule an appointment with the registrar?")).toEqual({
      kind: "APPOINTMENT"
    });
  });

  it("leaves informational document questions for the knowledge chatbot", () => {
    expect(detectRegistrarIntent("What documents are required for enrollment?")).toBeNull();
  });
});

describe("registrar student detail validation", () => {
  it("reads all three student details from one labeled Messenger reply", () => {
    expect(
      parseStudentDetails(
        "Last name: Dela Cruz\nStudent ID: 123456\nEmail: STUDENT@example.edu"
      )
    ).toEqual({
      lastName: "Dela Cruz",
      studentId: "123456",
      email: "student@example.edu"
    });
  });

  it("also reads three plain lines in the requested order", () => {
    expect(parseStudentDetails("Dela Cruz\n123456\nstudent@example.edu")).toEqual({
      lastName: "Dela Cruz",
      studentId: "123456",
      email: "student@example.edu"
    });
  });

  it("requires exactly six ID digits", () => {
    expect(isValidStudentId("123456")).toBe(true);
    expect(isValidStudentId("12345")).toBe(false);
    expect(isValidStudentId("12345A")).toBe(false);
  });

  it("accepts practical last names and rejects numeric input", () => {
    expect(isValidLastName("Dela Cruz")).toBe(true);
    expect(isValidLastName("O'Connor")).toBe(true);
    expect(isValidLastName("123456")).toBe(false);
  });

  it("requires a complete email address", () => {
    expect(isValidEmail("student@example.edu")).toBe(true);
    expect(isValidEmail("student@example")).toBe(false);
  });
});
