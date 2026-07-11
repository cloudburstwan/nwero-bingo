import express from "express";
import Database from "../../database";
import Sessions from "../../sessions";
import APIError from "../../types/APIError";
import requireSessionMiddleware, { RequestWithSession } from "../../utils/RequireSessionMiddleware";
import { batchCheckType } from "../../utils/checkType";
import { HistoryAction } from "../../database/types/History";

export function TemplatesCardsAPI(database: Database, sessions: Sessions) {
  const api = express.Router();

  api.get("/", express.urlencoded({ extended: true }), requireSessionMiddleware(sessions), async (req, res) => {
    let limit = parseInt(req.query.limit as string || "20");
    if (isNaN(limit)) limit = 20;
    let offset = parseInt(req.query.offset as string || "0");
    if (isNaN(offset)) offset = 0;
    let shouldBypassFilterCheck = req.query.showUpcomingCards ? sessions.validate(req.header("Authorization")) : false;

    let cards = await database.templates.getCardList(limit, offset);
    res.status(200).json(cards);
  });

  api.get("/:id", async (req, res) => {
    if (req.header("Authorization") === undefined)
      throw new APIError(401, "UNAUTHORIZED", "You must have an active session to access this endpoint.");

    if (!req.header("Authorization")?.startsWith("Bearer "))
      throw new APIError(400, "BAD_AUTHORIZATION_HEADER_FORMAT", "Authentication headers must start with 'Bearer'.");

    if (!sessions.validate(req.header("Authorization")))
      throw new APIError(401, "UNAUTHORIZED", "You must have an active session to access this endpoint.");

    try {
      let card = await database.templates.getCard(req.params.id);

      res.status(200).json({
        id: card.id,
        name: card.name,
        description: card.description,
        width: card.width,
        height: card.height,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        buckets: await card.getBucketIds(),
        freeSpaces: await card.getFreeSpaceIds(),
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a card with the id ${req.params.id}.`);
      else throw err;
    }
  })

  api.put("/", express.json(), requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("name", req.body.name, "string");
    checkType("description", req.body.description, "string", { canBeNull: true });
    checkType("width", req.body.width, "number");
    checkType("height", req.body.height, "number");
    completeBatch();

    let card = await database.templates.createCard(req.body.name, req.body.description, req.body.width, req.body.height);

    await database.addHistory(req.session!.userId, "templates_cards", HistoryAction.CREATE, card.id, {
      name: card.name,
      description: card.description,
      width: card.width,
      height: card.height,
    });

    res.status(200).json({
      id: card.id,
      name: card.name,
      description: card.description,
      width: card.width,
      height: card.height,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    });
  });

  api.patch("/:id", express.json(), requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("name", req.body.name, "string", { canBeUndefined: true });
    checkType("description", req.body.description, "string", { canBeUndefined: true, canBeNull: true });
    checkType("width", req.body.width, "number", { canBeUndefined: true });
    checkType("height", req.body.height, "number", { canBeUndefined: true });
    completeBatch();

    try {
      let card = await database.templates.getCard(req.params.id as string);
      let oldCard = Object.freeze({...card});
      let updatedRawData: any = Object.assign(card, req.body);

      card.name = updatedRawData.name;
      card.description = updatedRawData.description;
      card.width = updatedRawData.width;
      card.height = updatedRawData.height;

      await database.templates.updateCard(card);

      await database.addHistory(req.session!.userId, "templates_cards", HistoryAction.UPDATE, card.id, {
        before: {
          name: oldCard.name,
          description: oldCard.description,
          width: oldCard.width,
          height: oldCard.height,
        },
        after: {
          name: card.name,
          description: card.description,
          width: card.width,
          height: card.height,
        }
      });

      res.status(200).json({
        id: card.id,
        name: card.name,
        description: card.description,
        width: card.width,
        height: card.height,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        buckets: await card.getBucketIds(),
        freeSpaces: await card.getFreeSpaceIds(),
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ENTITY_NOT_FOUND", `Could not find a card with the id ${req.params.id}.`);
      else throw err;
    }
  });

  // TODO: Delete card (requires session)

  return api;
}