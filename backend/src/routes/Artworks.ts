import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import APIError from "../types/APIError";
import requireSessionMiddleware from "../utils/RequireSessionMiddleware";

export function ArtworksAPI(database: Database, sessions: Sessions) {
  const api = express.Router();

  api.get("/", express.urlencoded({ extended: true }), requireSessionMiddleware(sessions), async (req, res) => {
    let limit = parseInt(req.query.limit as string || "20");
    if (isNaN(limit)) limit = 20;
    let offset = parseInt(req.query.offset as string || "0");
    if (isNaN(offset)) offset = 0;

    let artworks = await database.getArtworks(limit, offset);
    res.status(200).json(artworks);
  });

  // TODO: Get artwork (requires session)

  // TODO: Create artwork (requires session)

  // TODO: Update artwork (requires session)

  // TODO: Delete artwork (requires session)

  return api;
}