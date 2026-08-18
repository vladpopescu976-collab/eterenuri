import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { inregistreazaEsec, ipDinCerere, stergeEsecurile, verificaLimitarea } from "@/lib/limitare";

/**
 * `authorize` nu poate trimite un mesaj propriu spre interfață — orice `null`
 * ajunge la aceeași eroare generică. O eroare de tipul acesta pune însă un
 * `code` în adresa de redirectare, iar pagina de autentificare îl citește ca
 * să explice exact ce s-a întâmplat.
 */
class EmailNeconfirmat extends CredentialsSignin {
  code = "email_neconfirmat";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/autentificare",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Parolă", type: "password" },
        // Tipul de cont ales in interfata. Daca e trimis, contul trebuie sa
        // corespunda — altfel autentificarea de pe tabul "Cont Personal" cu
        // datele unui cont Business te-ar duce in panoul Business.
        expectedRole: { label: "Tip cont", type: "text" },
      },
      authorize: async (credentials, request) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Fără limitare, cineva poate încerca parole la nesfârșit.
        const ip = ipDinCerere(request);
        const limitare = await verificaLimitarea(parsed.data.email, ip);
        if (!limitare.permis) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) {
          await inregistreazaEsec(parsed.data.email, ip);
          return null;
        }

        const passwordValid = await bcrypt.compare(parsed.data.password, user.password);
        if (!passwordValid) {
          await inregistreazaEsec(parsed.data.email, ip);
          return null;
        }

        // Contul exista, parola e buna, dar adresa nu a fost confirmata.
        // Verificam dupa parola, ca sa nu se poata afla din afara care adrese
        // au cont neconfirmat.
        if (!user.emailVerified) {
          throw new EmailNeconfirmat();
        }

        const expectedRole = credentials?.expectedRole;
        if (
          (expectedRole === "PERSONAL" || expectedRole === "BUSINESS") &&
          user.role !== expectedRole
        ) {
          return null;
        }

        await stergeEsecurile(parsed.data.email, ip);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
