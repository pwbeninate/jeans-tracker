export const photoPrefix = (jeanId: string) => `jeans/${jeanId}/`;

/** Photos allowed per pair; bounds what one account can put in the Blob store. */
export const MAX_PHOTOS_PER_JEAN = 200;

/**
 * Shape check only: a public Blob URL under this pair's prefix. It can't tell
 * our store from someone else's, so callers also confirm the blob with head().
 */
export function isOwnedBlob(jeanId: string, url: string, pathname: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(u.pathname);
  } catch {
    return false;
  }
  return (
    u.protocol === "https:" &&
    u.hostname.endsWith(".public.blob.vercel-storage.com") &&
    pathname.startsWith(photoPrefix(jeanId)) &&
    !pathname.includes("..") &&
    decoded === `/${pathname}`
  );
}
