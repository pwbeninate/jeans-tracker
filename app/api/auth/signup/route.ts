import bcrypt from "bcryptjs";
import { db, users } from "@/db";
import { HttpError, json, parseBody, route } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { signupOpen } from "@/lib/signup";
import { signupSchema } from "@/lib/validators";

export const POST = route(async (req) => {
  if (!signupOpen()) throw new HttpError(403, "Signups are closed");
  await rateLimit(`signup:ip:${clientIp(req)}`, 5, 60 * 60);
  const { email, password, name } = await parseBody(req, signupSchema);
  const passwordHash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(users)
    .values({ email, passwordHash, name })
    .onConflictDoNothing()
    .returning({ id: users.id, email: users.email });
  if (!created) throw new HttpError(409, "Email already registered");
  return json(created, 201);
});
