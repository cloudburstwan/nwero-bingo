import express from "express";
import Database from "../../database";
import Sessions from "../../sessions";
import APIError from "../../types/APIError";
import requireSessionMiddleware from "../../utils/RequireSessionMiddleware";

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
        throw new APIError(404, "CARD_NOT_FOUND", `Could not find a card with the id ${req.params.id}.`);
      else throw err;
    }
  })

  // TODO: Create card (requires session)

  // TODO: Update card (requires session)

  // TODO: Delete card (requires session)

  // TODO: Archive card (requires session)

  return api;
}