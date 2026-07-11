import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import APIError from "../types/APIError";
import requireSessionMiddleware, { RequestWithSession } from "../utils/RequireSessionMiddleware";
import { batchCheckType } from "../utils/checkType";
import Bucket from "../database/types/Bucket";
import { HistoryAction } from "../database/types/History";

export function BucketsAPI(database: Database, sessions: Sessions) {
  const api = express.Router();

  api.get("/:id", async (req, res) => {
    try {
      let card = await database.getBucket(req.params.id);
      console.log(card);
      res.status(200).json({
        id: card.id,
        name: card.name,
        weight: card.weight,
        prompts: (await card.getPrompts()).map(prompt => ({
          id: prompt.id,
          prompt: prompt.prompt,
          description: prompt.description,
        })),
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a bucket with the id ${req.params.id}.`);
      else throw err;
    }
  });

  api.put("/", express.json(), requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("name", req.body.name, "string");
    checkType("cardId", req.body.cardId, "string")
    checkType("weight", req.body.weight, "number");
    completeBatch();

    if (req.body.weight <= 0 || req.body.weight > 1)
      throw new APIError(400, "INVALID_WEIGHT", "Weight must be between 0 (exclusive) and 1 (inclusive).");

    try {
      await database.getCard(req.body.cardId);
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a card with the id ${req.body.cardId}.`);
      else throw err;
    }

    let bucket = await database.createBucket(req.body.name, req.body.cardId, req.body.weight);

    await database.addHistory(req.session!.userId, "buckets", HistoryAction.CREATE, bucket.id,
      {
        name: bucket.name,
        cardId: bucket.cardId,
        weight: bucket.weight,
      });

    res.status(200).json({
      id: bucket.id,
      name: bucket.name,
      cardId: bucket.cardId,
      weight: bucket.weight,
      prompts: [],
    });
  });

  api.patch("/:id", express.json(), requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("name", req.body.name, "string", { canBeUndefined: true });
    checkType("weight", req.body.weight, "number", { canBeUndefined: true });
    completeBatch();

    try {
      let bucket = await database.getBucket(req.params.id as string);
      let oldBucket = Object.freeze({...bucket});
      let updatedRawData: Bucket = Object.assign(bucket, req.body);

      bucket.name = updatedRawData.name;
      bucket.weight = updatedRawData.weight;

      await database.updateBucket(bucket);

      await database.addHistory(req.session!.userId, "buckets", HistoryAction.UPDATE, bucket.id, {
        before: {
          name: oldBucket.name,
          cardId: oldBucket.cardId,
          weight: oldBucket.weight,
        },
        after: {
          name: bucket.name,
          cardId: bucket.cardId,
          weight: bucket.weight,
        }
      })

      res.status(200).json({
        id: bucket.id,
        name: bucket.name,
        cardId: bucket.cardId,
        weight: bucket.weight,
        prompts: await bucket.getPrompts(),
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a bucket with the id ${req.params.id}.`);
      else throw err;
    }
  })

  api.delete("/:id", requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    try {
      let bucket = await database.getBucket(req.params.id as string);

      await database.deleteBucket(bucket);

      await database.addHistory(req.session!.userId, "buckets", HistoryAction.DELETE, bucket.id, null);

      res.status(204).send();
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a bucket with the id ${req.params.id}.`);
      else throw err;
    }
  });

  return api;
}