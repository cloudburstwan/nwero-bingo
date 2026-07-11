import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import APIError from "../types/APIError";
import requireSessionMiddleware, { RequestWithSession } from "../utils/RequireSessionMiddleware";
import { batchCheckType } from "../utils/checkType";
import Artwork from "../database/types/Artwork";
import Card from "../database/types/Card";
import { HistoryAction } from "../database/types/History";
import FreeSpace from "../database/types/FreeSpace";

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

  api.put("/", express.json(), requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("cardId", req.body.cardId, "string");
    checkType("artworkId", req.body.artworkId, "string", { canBeNull: true });
    checkType("x", req.body.x, "number");
    checkType("y", req.body.y, "number");
    checkType("stretch", req.body.stretch, "boolean");
    completeBatch();

    try {
      await database.getCard(req.body.cardId);
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a card with the id ${req.body.cardId}.`);
      else throw err;
    }

    try {
      if (req.body.artworkId !== null)
        await database.getArtwork(req.body.artworkId);
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find an artwork with the id ${req.body.artworkId}.`);
      else throw err;
    }

    let freeSpace = await database.createFreeSpace(req.body.cardId, req.body.artworkId, req.body.x, req.body.y, req.body.stretch);

    await database.addHistory(req.session!.userId, "free_spaces", HistoryAction.CREATE, freeSpace.id,
      {
        cardId: freeSpace.cardId,
        artworkId: freeSpace.artworkId,
        x: freeSpace.x,
        y: freeSpace.y,
        stretch: freeSpace.stretch
      });

    res.status(200).json({
      id: freeSpace.id,
      cardId: freeSpace.cardId,
      artworkId: freeSpace.artworkId,
      x: freeSpace.x,
      y: freeSpace.y,
      stretch: freeSpace.stretch
    });
  });

  api.patch("/:id", express.json(), requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("artworkId", req.body.artworkId, "string", { canBeUndefined: true, canBeNull: true });
    checkType("x", req.body.x, "number", { canBeUndefined: true });
    checkType("y", req.body.y, "number", { canBeUndefined: true });
    checkType("stretch", req.body.stretch, "boolean", { canBeUndefined: true });
    completeBatch();

    try {
      if (![null, undefined].includes(req.body.artworkId))
        await database.getArtwork(req.body.artworkId);
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find an artwork with the id ${req.body.artworkId}.`);
      else throw err;
    }

    try {
      let freeSpace = await database.getFreeSpace(req.params.id as string);
      let oldFreeSpace = Object.freeze({...freeSpace});
      let updatedRawData: FreeSpace = Object.assign(freeSpace, req.body);

      freeSpace.artworkId = updatedRawData.artworkId;
      freeSpace.x = updatedRawData.x;
      freeSpace.y = updatedRawData.y;
      freeSpace.stretch = updatedRawData.stretch;

      await database.updateFreeSpace(freeSpace);

      await database.addHistory(req.session!.userId, "free_spaces", HistoryAction.UPDATE, freeSpace.id, {
        before: {
          cardId: oldFreeSpace.cardId,
          artworkId: oldFreeSpace.artworkId,
          x: oldFreeSpace.x,
          y: oldFreeSpace.y,
          stretch: oldFreeSpace.stretch
        },
        after: {
          cardId: freeSpace.cardId,
          artworkId: freeSpace.artworkId,
          x: freeSpace.x,
          y: freeSpace.y,
          stretch: freeSpace.stretch
        }
      });

      res.status(200).json({
        id: freeSpace.id,
        cardId: freeSpace.cardId,
        artworkId: freeSpace.artworkId,
        x: freeSpace.x,
        y: freeSpace.y,
        stretch: freeSpace.stretch
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a free space with the id ${req.params.id}.`);
      else throw err;
    }
  })

  api.delete("/:id", requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    try {
      let freeSpace = await database.getFreeSpace(req.params.id as string);
      await database.deleteFreeSpace(freeSpace);
      await database.addHistory(req.session!.userId, "free_spaces", HistoryAction.DELETE, freeSpace.id, null);
      res.status(204).send();
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a free space with the id ${req.params.id}.`);
      else throw err;
    }
  });

  return api;
}