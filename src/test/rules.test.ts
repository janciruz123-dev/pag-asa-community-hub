import { describe, expect, it } from "vitest";
import { initialLoginMode, safeRedirect } from "@/lib/auth-actions";
import { complaintSchema, registerSchema, sanitizeSearch, staffAccountSchema, validateFile } from "@/lib/validation";

const validResident = {
  full_name: "Juan Dela Cruz", email: "juan@example.com", password: "secret123", confirm_password: "secret123",
  contact_number: "09171234567", address: "123 Rizal St., Purok 3, Barangay Pag-asa", privacy_consent: true as const,
};

describe("registration", () => {
  it("accepts a complete resident registration", () => {
    expect(registerSchema.safeParse(validResident).success).toBe(true);
  });
  it("requires privacy consent", () => {
    expect(registerSchema.safeParse({ ...validResident, privacy_consent: false }).success).toBe(false);
  });
  it("rejects mismatched passwords", () => {
    expect(registerSchema.safeParse({ ...validResident, confirm_password: "other1234" }).success).toBe(false);
  });
  it("requires at least 8 characters with a letter and a number", () => {
    expect(registerSchema.safeParse({ ...validResident, password: "abcdefgh", confirm_password: "abcdefgh" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validResident, password: "abc123", confirm_password: "abc123" }).success).toBe(false);
  });
  it("has no way to choose a role", () => {
    const parsed = registerSchema.safeParse({ ...validResident, role: "admin" });
    expect(parsed.success && "role" in parsed.data).toBe(false);
  });
});

describe("administrator account creation", () => {
  it("requires matching password confirmation", () => {
    const base = { full_name: "Maria Santos", email: "maria@example.com", password: "Admin2026", confirm_password: "Admin2026", contact_number: "" };
    expect(staffAccountSchema.safeParse(base).success).toBe(true);
    expect(staffAccountSchema.safeParse({ ...base, confirm_password: "Admin2027" }).success).toBe(false);
  });
});

describe("complaints", () => {
  it("rejects an incident date in the future", () => {
    const future = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    expect(complaintSchema.safeParse({ title: "Clogged drainage", category: "Road and drainage concerns", description: "Water floods the street after rain.", location: "Purok 2", incident_date: future }).success).toBe(false);
  });
});

describe("file uploads", () => {
  it("allows images and PDFs up to 5 MB only", () => {
    expect(validateFile({ type: "application/pdf", size: 5 * 1024 * 1024 })).toBeNull();
    expect(validateFile({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).not.toBeNull();
    expect(validateFile({ type: "application/x-msdownload", size: 1000 })).not.toBeNull();
  });
});

describe("login", () => {
  it("shows the Administrator Login to visitors bounced from admin pages", () => {
    expect(initialLoginMode(undefined, "/admin/complaints")).toBe("admin");
    expect(initialLoginMode(undefined, "/dashboard")).toBe("resident");
    expect(initialLoginMode("resident", "/admin")).toBe("resident");
  });
  it("never redirects off-site after login", () => {
    expect(safeRedirect("https://evil.example/steal", "/dashboard")).toBe("/dashboard");
    expect(safeRedirect("//evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeRedirect("/complaints?x=1", "/dashboard")).toBe("/complaints?x=1");
  });
  it("strips characters that could break search filters", () => {
    expect(sanitizeSearch("abc,(def)%")).toBe("abc def");
  });
});

describe("first administrator setup code", () => {
  it("accepts only the exact configured code", async () => {
    const { setupCodeMatches } = await import("@/lib/setup-code");
    expect(await setupCodeMatches("barangay-owner-2026", "barangay-owner-2026")).toBe(true);
    expect(await setupCodeMatches("barangay-owner-2026", "barangay-owner-2025")).toBe(false);
  });
  it("refuses every code when the owner has not configured one", async () => {
    const { setupCodeMatches } = await import("@/lib/setup-code");
    expect(await setupCodeMatches(undefined, "anything-at-all")).toBe(false);
    expect(await setupCodeMatches("", "")).toBe(false);
  });
  it("refuses when the configured code is shorter than 12 characters", async () => {
    const { setupCodeMatches } = await import("@/lib/setup-code");
    expect(await setupCodeMatches("short1", "short1")).toBe(false);
  });
});
