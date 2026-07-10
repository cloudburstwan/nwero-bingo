import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import requireSessionMiddleware from "../utils/RequireSessionMiddleware";
import APIError from "../types/APIError";
import { batchCheckType } from "../utils/checkType";

export function PromptsAPI(database: Database, sessions: Sessions) {
  const api = express.Router();

  api.get(`/:id`, requireSessionMiddleware(sessions), async (req, res) => {
    try {
      let prompt = await database.getPrompt(req.params.id as string);
      res.status(200).json({
        id: prompt.id,
        bucketId: prompt.bucketId,
        prompt: prompt.prompt,
        description: prompt.description,
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a prompt with the id ${req.params.id}.`);
      else throw err;
    }
  });

  api.put("/", express.json(), requireSessionMiddleware(sessions), async (req, res) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("bucketId", req.body.bucketId, "string");
    checkType("prompt", req.body.prompt, "string");
    checkType("description", req.body.description, "string", true);
    completeBatch();

    try {
      let prompt = await database.createPrompt(req.body.bucketId, req.body.prompt, req.body.description);
      res.status(200).json({
        id: prompt.id,
        bucketId: prompt.bucketId,
        prompt: prompt.prompt,
        description: prompt.description,
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a bucket with the id ${req.body.bucketId}.`);
      else throw err;
    }
  })

  // TODO: Update prompt (requires authentication)

  // TODO: Delete prompt (requires authentication)

  return api;
}