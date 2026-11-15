import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { HttpError, idParam, json, parseBody, requireUser, route, type IdCtx } from "@/lib/http";
import { count, eq } from "drizzle-orm";
import { db, photos } from "@/db";
import { MAX_PHOTOS_PER_JEAN, photoPrefix } from "@/lib/blob";
import { ownedJean } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

/** Issues short-lived client tokens so browsers upload straight to Blob. */
export const POST = route<IdCtx>(async (req, ctx) => {
  const userId = await requireUser();
  const jean = await ownedJean(userId, await idParam(ctx));
  // Tokens can be used without ever registering the photo, so they are metered per user.
  await rateLimit(`upload:${userId}`, 120, 60 * 60);
  const [{ n }] = await db
    .select({ n: count() })
    .from(photos)
    .where(eq(photos.jeanId, jean.id));
  if (n >= MAX_PHOTOS_PER_JEAN) throw new HttpError(400, "Photo limit reached for this pair");
  const body = await parseBody(req, z.custom<HandleUploadBody>());
  const result = await handleUpload({
    request: req,
    body,
    onBeforeGenerateToken: async (pathname) => {
      if (!pathname.startsWith(photoPrefix(jean.id)) || pathname.includes("..")) {
        throw new HttpError(400, "Invalid upload path");
      }
      return {
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        maximumSizeInBytes: 10 * 1024 * 1024,
        addRandomSuffix: true,
      };
    },
  });
  return json(result);
});
