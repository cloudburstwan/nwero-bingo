import express from "express";
import Database from "../../database";
import Sessions from "../../sessions";
import APIError from "../../types/APIError";
import requireSessionMiddleware, { RequestWithSession } from "../../utils/RequireSessionMiddleware";
import { batchCheckType } from "../../utils/checkType";
import TemplateBucket from "../../database/types/templates/TemplateBucket";

export function TemplatesBucketsAPI(database: Database, sessions: Sessions) {
  const api = express.Router();

  api.get("/", express.urlencoded({ extended: true }), requireSessionMiddleware(sessions), async (req, res) => {
    let limit = parseInt(req.query.limit as string || "20");
    if (isNaN(limit)) limit = 20;
    let offset = parseInt(req.query.offset as string || "0");
    if (isNaN(offset)) offset = 0;

    let buckets = await database.templates.getBucketList(limit, offset);
    res.status(200).json(buckets);
  })

  api.get("/:id", requireSessionMiddleware(sessions), async (req, res) => {
    try {
      let card = await database.templates.getBucket(req.params.id as string);
      console.log(card);
      res.status(200).json({
        id: card.id,
        name: card.name,
        cardId: card.cardId,
        weight: card.weight,
        standalone: card.standalone,
        prompts: (await card.getPrompts()).map(prompt => ({
          id: prompt.id,
          prompt: prompt.prompt,
          description: prompt.description,
        })),
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a bucket template with the id ${req.params.id}.`);
      else throw err;
    }
  });

  api.put("/", express.json(), requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("name", req.body.name, "string");
    checkType("cardId", req.body.cardId, "string", { canBeNull: true })
    checkType("weight", req.body.weight, "number");
    checkType("standalone", req.body.standalone, "boolean");
    completeBatch();

    if (req.body.weight <= 0 || req.body.weight > 1)
      throw new APIError(400, "INVALID_WEIGHT", "Weight must be between 0 (exclusive) and 1 (inclusive).");

    if (!req.body.standalone && req.body.cardId == null)
      throw new APIError(400, "INVALID_CARD_ID", "Card ID must be provided when not creating a standalone bucket template.");

    if (req.body.standalone && req.body.cardId != null)
      throw new APIError(400, "INVALID_CARD_ID", "Card ID must not be provided when creating a standalone bucket template.");

    try {
      if (req.body.cardId !== null)
        await database.templates.getCard(req.body.cardId);

      let bucket: TemplateBucket;
      if (req.body.standalone)
        bucket = await database.templates.createStandaloneBucket(req.body.name, req.body.weight);
      else
        bucket = await database.templates.createBucket(req.body.name, req.body.cardId, req.body.weight);

      res.status(200).json({
        id: bucket.id,
        name: bucket.name,
        cardId: bucket.cardId,
        weight: bucket.weight,
        standalone: bucket.standalone,
        prompts: [],
        createdAt: bucket.createdAt,
        updatedAt: bucket.updatedAt,
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a card template with the id ${req.body.cardId}.`);
      else throw err;
    }
  });

  // TODO: Update bucket (requires session)

  // TODO: Delete bucket (requires session)

  return api;
}