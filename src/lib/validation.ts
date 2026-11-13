import { z } from "zod";
import { COMPLAINT_CATEGORIES } from "./constants";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Returns an error message, or null when the file is acceptable. */
export function validateFile(
  file: { size: number; type: string },
  allowed: string[] = ALLOWED_ATTACHMENT_TYPES,
): string | null {
  if (!allowed.includes(file.type)) {
    return allowed.includes("application/pdf")
      ? "Only JPG, PNG, WEBP images or PDF documents are allowed."
      : "Only JPG, PNG or WEBP images are allowed.";
  }
  if (file.size > MAX_FILE_BYTES) return "Each file must be 5 MB or smaller.";
  if (file.size <= 0) return "The selected file is empty.";
  return null;
}

/** Make a user-provided filename safe for storage paths. */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "file";
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  return ext ? `${base}.${ext}` : base;
}

/** Strip characters that would break a PostgREST `or()` filter. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[%,()*\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

// Philippine mobile (09XXXXXXXXX or +639XXXXXXXXX) or landline-style digits.
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+63|0)9\d{9}$|^(\(0\d{1,2}\)|0\d{1,2})[\s-]?\d{3}[\s-]?\d{4}$/, "Enter a valid contact number, e.g. 09171234567");

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your full name").max(120),
    email: z.string().trim().email("Enter a valid email address").max(255),
    password: passwordSchema,
    confirm_password: z.string(),
    contact_number: phoneSchema,
    address: z.string().trim().min(10, "Enter your complete residential address").max(300),
    privacy_consent: z.literal(true, { errorMap: () => ({ message: "You must agree to the privacy notice" }) }),
  })
  .refine((d) => d.password === d.confirm_password, { message: "Passwords do not match", path: ["confirm_password"] });

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  contact_number: phoneSchema,
  address: z.string().trim().min(10, "Enter your complete residential address").max(300),
});

export const complaintSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(150),
  category: z.enum(COMPLAINT_CATEGORIES, { errorMap: () => ({ message: "Choose a category" }) }),
  description: z.string().trim().min(10, "Please describe the concern (at least 10 characters)").max(5000),
  location: z.string().trim().min(3, "Enter the location of the incident").max(300),
  incident_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date of the incident")
    .refine((d) => d <= todayISO(), "Date of incident cannot be in the future"),
});

export const serviceRequestSchema = z.object({
  category_id: z.string().uuid("Choose a service"),
  purpose: z.string().trim().min(5, "State the purpose of your request").max(500),
  additional_info: z.string().trim().max(2000).optional(),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(200),
  content: z.string().trim().min(10, "Content must be at least 10 characters").max(10000),
  category_id: z.string().uuid("Choose a category"),
  author_office: z.string().trim().min(2, "Enter the publishing office").max(120),
});

export function todayISO(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export const staffAccountSchema = z
  .object({
    full_name: z.string().trim().min(2, "Enter the full name").max(120),
    email: z.string().trim().email("Enter a valid email address").max(255),
    password: passwordSchema,
    confirm_password: z.string(),
    contact_number: z.union([z.literal(""), phoneSchema]),
  })
  .refine((d) => d.password === d.confirm_password, { message: "Passwords do not match", path: ["confirm_password"] });
