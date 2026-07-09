import express from "express";
import Database from "../database";
import Sessions from "../sessions";

export function UsersAPI(database: Database, sessions: Sessions) {
  const api = express.Router();

  // TODO: Get current user (requires authentication)

  // TODO: Get user by ID (requires authentication)

  return api;
}