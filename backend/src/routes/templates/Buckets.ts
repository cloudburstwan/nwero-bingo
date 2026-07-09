import express from "express";
import Database from "../../database";
import Sessions from "../../sessions";
import APIError from "../../types/APIError";
import requireSessionMiddleware from "../../utils/RequireSessionMiddleware";

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
      let card = await database.getBucket(req.params.id as string);
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

  // TODO: Create bucket (requires session)

  // TODO: Update bucket (requires session)

  // TODO: Delete bucket (requires session)

  return api;
}