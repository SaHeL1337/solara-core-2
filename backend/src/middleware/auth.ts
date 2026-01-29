import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";

// This middleware validates the JWT signature locally using your Secret Key
// It does NOT make a network call to Clerk for every request
export const requireAuth = ClerkExpressRequireAuth();
