export const photoPrefix = (jeanId: string) => `jeans/${jeanId}/`;

/** True when the URL is in a public Blob store and under this pair's prefix. */
export function isOwnedBlob(jeanId: string, url: string, pathname: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  return (
    u.protocol === "https:" &&
    u.hostname.endsWith(".public.blob.vercel-storage.com") &&
    pathname.startsWith(photoPrefix(jeanId)) &&
    !pathname.includes("..") &&
    decodeURIComponent(u.pathname) === `/${pathname}`
  );
}
