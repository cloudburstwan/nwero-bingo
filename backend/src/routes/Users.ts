import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import requireSessionMiddleware, { RequestWithSession } from "../utils/RequireSessionMiddleware";
import APIError from "../types/APIError";

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

  api.get("/:id", requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    try {
      let user = await database.getUser(req.params.id as string);

      res.status(200).json({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a user with the id ${req.params.id}.`);
      else throw err;
    }
  })

  return api;
}