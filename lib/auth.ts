import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db, users } from "@/db";
import { clientIp, hit } from "@/lib/rate-limit";
import { credentialsSchema } from "@/lib/validators";

// Hash of a discarded random string: compared against when the email is unknown,
// so a missing account takes as long to reject as a wrong password.
const DUMMY_HASH = "$2b$10$akyfQnkByUP11W3yKYh1PeCEW4VbsLQ4wzh7I7fPS05yPdT.z6eEq";

const WINDOW = 15 * 60;

/** Stored in the session token; changes when the password does, which ends older sessions. */
const fingerprint = (passwordHash: string) =>
  createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        // Both counters are always bumped, so neither check short-circuits the other.
        const [ipOk, emailOk] = await Promise.all([
          hit(`login:ip:${clientIp(request)}`, 30, WINDOW),
          hit(`login:email:${parsed.data.email}`, 10, WINDOW),
        ]);
        if (!ipOk || !emailOk) throw new RateLimited();
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email));
        const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
        return user && ok ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  ],
  callbacks: {
    // Runs on every auth() call. Returning null ends the session, so a deleted
    // account or a changed password takes effect on the next request.
    async jwt({ token, user }) {
      const id = user?.id ?? token.sub;
      if (!id) return null;
      const [row] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, id));
      if (!row) return null;
      const pwf = fingerprint(row.passwordHash);
      if (user) return { ...token, sub: id, pwf };
      return token.pwf === pwf ? token : null;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
