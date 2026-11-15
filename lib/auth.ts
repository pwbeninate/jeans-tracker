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
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
