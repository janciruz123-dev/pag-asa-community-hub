import { supabase } from "@/integrations/supabase/client";
import { safeFileName } from "./validation";

export async function uploadToBucket(bucket: "attachments" | "media", folder: string, file: File) {
  const path = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function signedUrl(bucket: "attachments" | "media", path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function signedUrls(bucket: "attachments" | "media", paths: string[], expiresIn = 3600) {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {} as Record<string, string>;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, expiresIn);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  return map;
}
