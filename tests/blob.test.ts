import { describe, expect, it } from "vitest";
import { isOwnedBlob, photoPrefix } from "@/lib/blob";

const jean = "11111111-1111-1111-1111-111111111111";
const path = `${photoPrefix(jean)}front-AbC123.jpg`;
const url = `https://store.public.blob.vercel-storage.com/${path}`;

describe("isOwnedBlob", () => {
  it("accepts a blob under the pair's prefix", () => {
    expect(isOwnedBlob(jean, url, path)).toBe(true);
  });
  it("rejects other hosts", () => {
    expect(isOwnedBlob(jean, `https://evil.example.com/${path}`, path)).toBe(false);
  });
  it("rejects another pair's prefix", () => {
    const other = "22222222-2222-2222-2222-222222222222";
    expect(isOwnedBlob(other, url, path)).toBe(false);
  });
  it("rejects a pathname that doesn't match the URL", () => {
    expect(isOwnedBlob(jean, url, `${photoPrefix(jean)}other.jpg`)).toBe(false);
  });
  it("rejects plain http and garbage", () => {
    expect(isOwnedBlob(jean, url.replace("https", "http"), path)).toBe(false);
    expect(isOwnedBlob(jean, "nope", path)).toBe(false);
  });
});
