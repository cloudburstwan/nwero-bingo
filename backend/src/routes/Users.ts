import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import requireSessionMiddleware, { RequestWithSession } from "../utils/RequireSessionMiddleware";

export function UsersAPI(database: Database, sessions: Sessions) {
  const api = express.Router();

  api.get("/@me", requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    let user = await database.getUser(req.session!.userId);

    res.status(200).json({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl
    });
  });

  // TODO: Get user by ID (requires authentication)

  return api;
}