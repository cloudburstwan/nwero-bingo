import express from "express";
import Database from "../../database";
import Sessions from "../../sessions";
import APIError from "../../types/APIError";

export function TemplatesFreeSpacesAPI(database: Database, sessions: Sessions) {
  const api = express.Router();

  api.get("/:id", async (req, res) => {
    if (req.header("Authorization") === undefined)
      throw new APIError(401, "UNAUTHORIZED", "You must have an active session to access this endpoint.");

    if (!req.header("Authorization")?.startsWith("Bearer "))
      throw new APIError(400, "BAD_AUTHORIZATION_HEADER_FORMAT", "Authentication headers must start with 'Bearer'.");

    if (!sessions.validate(req.header("Authorization")))
      throw new APIError(401, "UNAUTHORIZED", "You must have an active session to access this endpoint.");

    try {
      let freeSpace = await database.templates.getFreeSpace(req.params.id);
      let artwork = await freeSpace.getArtwork()
      res.status(200).json({
        id: freeSpace.id,
        artwork: artwork === null ? null : {
          id: artwork.id,
          src: artwork.src,
          sourceName: artwork.sourceName,
          sourceUrl: artwork.sourceUrl
        },
        x: freeSpace.x,
        y: freeSpace.y,
        stretch: freeSpace.stretch
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "FREE_SPACE_NOT_FOUND", `Could not find a free space with the id ${req.params.id}.`);
      else throw err;
    }
  });

  // TODO: Create free space (requires session)

  // TODO: Update free space (requires session)

  // TODO: Delete free space (requires session)

  return api;
}