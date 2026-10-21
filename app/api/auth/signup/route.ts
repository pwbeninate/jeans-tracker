import bcrypt from "bcryptjs";
import { db, users } from "@/db";
import { HttpError, json, parseBody, route } from "@/lib/http";
import { signupSchema } from "@/lib/validators";

export const POST = route(async (req) => {
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
