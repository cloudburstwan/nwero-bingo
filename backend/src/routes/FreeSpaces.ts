import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import APIError from "../types/Error";

export function FreeSpacesAPI(database: Database, sessions: Sessions) {
  const api = express.Router();

  api.get("/:id", async (req, res) => {
    try {
      let freeSpace = await database.getFreeSpace(req.params.id);
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