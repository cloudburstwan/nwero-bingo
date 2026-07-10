import Sessions from "../sessions";
import express from "express";
import APIError from "../types/APIError";
import Session from "../sessions/Session";

export default function requireSessionMiddleware(sessions: Sessions) {
  return (req: RequestWithSession, res: express.Response, next: express.NextFunction) => {
    if (req.header("Authorization") === undefined)
      throw new APIError(401, "UNAUTHORIZED", "You must have an active session to access this endpoint.");

    if (!req.header("Authorization")?.startsWith("Bearer "))
      throw new APIError(400, "BAD_AUTHORIZATION_HEADER_FORMAT", "Authentication headers must start with 'Bearer'.");

    if (!sessions.validate(req.header("Authorization")))
      throw new APIError(401, "UNAUTHORIZED", "You must have an active session to access this endpoint.");

    let sessionId = req.header("Authorization")!.replace("Bearer ", "");
    req.session = sessions.get(sessionId)!;

    next();
  }
}

export type RequestWithSession = express.Request & { session?: Session }