import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import APIError from "../types/APIError";
import Card from "../database/types/Card";
import requireSessionMiddleware from "../utils/RequireSessionMiddleware";
import { batchCheckType } from "../utils/checkType";

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

  api.put("/", express.json(), requireSessionMiddleware(sessions), async (req, res) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("name", req.body.name, "string");
    checkType("description", req.body.description, "string", true);
    checkType("date", req.body.date, "date");
    checkType("width", req.body.width, "number");
    checkType("height", req.body.height, "number");
    completeBatch();

    let card: Card = await database.createCard(req.body.name, req.body.description, req.body.date, req.body.width, req.body.height);
    res.status(200).json({
      id: card.id,
      name: card.name,
      description: card.description,
      date: card.date,
      width: card.width,
      height: card.height,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      buckets: [],
      freeSpaces: [],
    });
  });

  api.patch("/:id", express.json(), requireSessionMiddleware(sessions), async (req, res) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("name", req.body.name, "string", true);
    checkType("description", req.body.description, "string", true);
    checkType("date", req.body.date, "date", true);
    checkType("width", req.body.width, "number", true);
    checkType("height", req.body.height, "number", true);
    completeBatch();

    try {
      let card = await database.getCard(req.params.id as string);

      let updatedRawData: Card = Object.assign(card, req.body);

      card.name = updatedRawData.name;
      card.description = updatedRawData.description;
      card.date = new Date(updatedRawData.date);
      card.width = updatedRawData.width;
      card.height = updatedRawData.height;

      let updatedCard: Card = await database.updateCard(card);
      res.status(200).json({
        id: updatedCard.id,
        name: updatedCard.name,
        description: updatedCard.description,
        date: updatedCard.date,
        width: updatedCard.width,
        height: updatedCard.height,
        createdAt: updatedCard.createdAt,
        updatedAt: updatedCard.updatedAt,
        buckets: await updatedCard.getBucketIds(),
        freeSpaces: await updatedCard.getFreeSpaceIds(),
      });
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "CARD_NOT_FOUND", `Could not find a card with the id ${req.params.id}.`);
      else throw err;
    }
  })

  // TODO: Delete card (requires session)

  // TODO: Archive card (requires session)

  return api;
}