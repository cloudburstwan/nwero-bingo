import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import APIError from "../types/APIError";
import Card from "../database/types/Card";

export function CardsAPI(database: Database, sessions: Sessions) {
  const api = express.Router();

  api.get("/", express.urlencoded({ extended: true }), async (req, res) => {
    let limit = parseInt(req.query.limit as string || "20");
    if (isNaN(limit)) limit = 20;
    let offset = parseInt(req.query.offset as string || "0");
    if (isNaN(offset)) offset = 0;
    let shouldBypassFilterCheck = req.query.showUpcomingCards ? sessions.validate(req.header("Authorization")) : false;

    let cards = await database.getCardList(limit, offset);
    res.status(200).json(cards.filter(card => shouldBypassFilterCheck || card.date < new Date()));
  });

  api.get("/archived", express.urlencoded({ extended: true }), async (req, res) => {
    let limit = parseInt(req.query.limit as string || "20");
    if (isNaN(limit)) limit = 20;
    let offset = parseInt(req.query.offset as string || "0");
    if (isNaN(offset)) offset = 0;

    let archivedCards = await database.getArchivedCardList(limit, offset);
    res.status(200).json(archivedCards);
  });

  api.get("/:id", async (req, res) => {
    try {
      let card = await database.getCard(req.params.id);
      res.status(200).json({
        id: card.id,
        name: card.name,
        description: card.description,
        date: card.date,
        width: card.width,
        height: card.height,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        buckets: await card.getBucketIds(),
        freeSpaces: await card.getFreeSpaceIds(),
      });
    } catch (err) {
      if (err instanceof ReferenceError) {
        // Check archived.
        try {
          let archivedCard = await database.getArchivedCard(req.params.id);
          res.redirect(archivedCard.getUrl());
        } catch (err) {
          if (err instanceof ReferenceError)
            throw new APIError(404, "CARD_NOT_FOUND", `Could not find a card with the id ${req.params.id}.`);
          else throw err;
        }
      }
      else throw err;
    }
  })

  // TODO: Create card (requires session)

  // TODO: Update card (requires session)

  // TODO: Delete card (requires session)

  // TODO: Archive card (requires session)

  return api;
}