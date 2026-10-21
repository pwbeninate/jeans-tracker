import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { HttpError, idParam, json, parseBody, requireUser, route, type IdCtx } from "@/lib/http";
import { photoPrefix } from "@/lib/blob";
import { ownedJean } from "@/lib/queries";
import { z } from "zod";

/** Issues short-lived client tokens so browsers upload straight to Blob. */
export const POST = route<IdCtx>(async (req, ctx) => {
  const userId = await requireUser();
  const jean = await ownedJean(userId, await idParam(ctx));
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
