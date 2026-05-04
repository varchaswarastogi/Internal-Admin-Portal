import type { AdminRole } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  role: AdminRole;
  name: string;
};

declare global {
  namespace Express {
    interface Request {
      admin?: AuthUser;
    }
  }
}
