import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { HttpError, notFound, parseBody, requireUser, route } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { passwordChangeSchema } from "@/lib/validators";

/** Changing the password changes the session fingerprint, which signs out every existing session. */
export const POST = route(async (req) => {
  const userId = await requireUser();
  await rateLimit(`password:${userId}`, 5, 15 * 60);
  const { currentPassword, newPassword } = await parseBody(req, passwordChangeSchema);
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw notFound();
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new HttpError(400, "Current password is incorrect");
  }
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(newPassword, 10) })
    .where(eq(users.id, userId));
  return new Response(null, { status: 204 });
});
