import type { Role } from "@prisma/client";
import type { DefaultSession } from "@auth/core/types";

declare module "@auth/core/types" {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
