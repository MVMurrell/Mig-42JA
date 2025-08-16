// types/express.d.ts
import "express-serve-static-core";

declare global {
  namespace Express {
    interface User {
      claims: {
        sub: string;
        email?: string;
        role?: string;
        [key: string]: unknown;
      };
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
