import { Request } from "express";
//probably not needed as we are using local interfaces as docker is not picking this up here for now
// todo fix or remove later
declare global {
  namespace Express {
    interface Request {
      auth: {
        userId: string;
      };
    }
  }
}
