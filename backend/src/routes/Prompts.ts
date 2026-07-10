import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import requireSessionMiddleware, { RequestWithSession } from "../utils/RequireSessionMiddleware";
import APIError from "../types/APIError";
import { batchCheckType } from "../utils/checkType";
import Prompt from "../database/types/Prompt";
import { HistoryAction } from "../database/types/History";

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

  api.put("/", express.json(), requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("bucketId", req.body.bucketId, "string");
    checkType("prompt", req.body.prompt, "string");
    checkType("description", req.body.description, "string", true);
    completeBatch();

    try {
      let prompt = await database.createPrompt(req.body.bucketId, req.body.prompt, req.body.description);

      await database.addHistory(req.session!.userId, "prompts", HistoryAction.CREATE, prompt.id, {
        bucketId: prompt.bucketId,
        prompt: prompt.prompt,
        description: prompt.description,
      });

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

  api.patch("/:id", express.json(), requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("prompt", req.body.prompt, "string", true);
    checkType("description", req.body.description, "string", true);
    completeBatch();

    try {
      let prompt = await database.getPrompt(req.params.id as string);
      let updatedRawData: Prompt = Object.assign(prompt, req.body);

      prompt.prompt = updatedRawData.prompt;
      prompt.description = updatedRawData.description;

      await database.updatePrompt(prompt);

      await database.addHistory(req.session!.userId, "prompts", HistoryAction.UPDATE, prompt.id, {
        before: {
          bucketId: prompt.bucketId,
          prompt: prompt.prompt,
          description: prompt.description,
        },
        after: {
          bucketId: updatedRawData.bucketId,
          prompt: updatedRawData.prompt,
          description: updatedRawData.description,
        }
      })

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
  })

  api.delete("/:id", requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    try {
      let prompt = await database.getPrompt(req.params.id as string);

      await database.deletePrompt(prompt);

      await database.addHistory(req.session!.userId, "prompts", HistoryAction.DELETE, prompt.id, null);

      res.status(204).send();
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a prompt with the id ${req.params.id}.`);
      else throw err;
    }
  })

  return api;
}