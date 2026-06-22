import { supabase } from "@/integrations/supabase/client";

// Extract storage path from a stored URL (legacy public URL or already a path)
export function extractStoragePath(bucket: string, urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith("http")) return urlOrPath;
  const marker = `/object/public/${bucket}/`;
  const signedMarker = `/object/sign/${bucket}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx >= 0) return urlOrPath.slice(idx + marker.length).split("?")[0];
  const sIdx = urlOrPath.indexOf(signedMarker);
  if (sIdx >= 0) return urlOrPath.slice(sIdx + signedMarker.length).split("?")[0];
  return null;
}

// Short-lived signed URL for a private bucket file.
export async function getSignedFileUrl(
  bucket: string,
  urlOrPath: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  const path = extractStoragePath(bucket, urlOrPath);
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}