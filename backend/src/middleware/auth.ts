import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";
import { Request, Response, NextFunction } from "express";

// This middleware validates the authentication state
// If the user is not authenticated, it redirects them to the home page ("/")
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (process.env.NODE_ENV === "test") {
    // Basic test bypass
    (req as any).auth = { userId: "test-user-buildings" };
    return next();
  }

  ClerkExpressWithAuth()(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (!(req as any).auth?.userId) {
      return res.redirect("/");
    }

    next();
  });
};
