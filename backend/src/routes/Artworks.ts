import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import APIError from "../types/Error";

export function ArtworksAPI(database: Database, sessions: Sessions) {
  const api = express.Router();

  api.get("/", express.urlencoded({ extended: true }), async (req, res) => {
    if (req.header("Authorization") === undefined)
      throw new APIError(401, "UNAUTHORIZED", "You must have an active session to access this endpoint.");

    if (!req.header("Authorization")?.startsWith("Bearer "))
      throw new APIError(400, "BAD_AUTHORIZATION_HEADER_FORMAT", "Authentication headers must start with 'Bearer'.");

    if (!sessions.validate(req.header("Authorization")))
      throw new APIError(401, "UNAUTHORIZED", "You must have an active session to access this endpoint.");

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