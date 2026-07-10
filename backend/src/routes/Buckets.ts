import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import APIError from "../types/APIError";
import requireSessionMiddleware, { RequestWithSession } from "../utils/RequireSessionMiddleware";
import { batchCheckType } from "../utils/checkType";

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
        throw new APIError(404, "BUCKET_NOT_FOUND", `Could not find a bucket with the id ${req.params.id}.`);
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
      let card = await database.getCard(req.body.cardId);

      let bucket = await database.createBucket(req.body.name, card.id, req.body.weight);

      res.status(200).json({
        id: bucket.id,
        name: bucket.name,
        cardId: bucket.cardId,
        weight: bucket.weight,
        prompts: [],
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "CARD_NOT_FOUND", `Could not find a card with the id ${req.body.cardId}.`);
      else throw err;
    }
  });

  // TODO: Update bucket (requires session)

  // TODO: Delete bucket (requires session)

  return api;
}