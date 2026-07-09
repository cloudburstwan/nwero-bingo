import express from 'express';
import Database from './database';
import Sessions from "./sessions";
import { CardsAPI } from "./routes/Cards";
import { BucketsAPI } from "./routes/Buckets";
import { FreeSpacesAPI } from "./routes/FreeSpaces";
import { ArtworksAPI } from "./routes/Artworks";
import { SessionsAPI } from "./routes/Sessions";
import { HistoryAPI } from "./routes/History";
import { UsersAPI } from "./routes/Users";
import APIError from "./types/APIError";
import crypto from "crypto";
import { TemplatesCardsAPI } from "./routes/templates/Cards";
import { TemplatesBucketsAPI } from "./routes/templates/Buckets";
import { TemplatesFreeSpacesAPI } from "./routes/templates/FreeSpaces";

const api = express();
const database = new Database();
const sessions = new Sessions();

api.use((req, res, next) => {
  // Assigns a request ID to the request
  req.headers['--internal-request-id'] = crypto.randomBytes(12).toString('hex');
  res.setHeader("X-Request-ID", req.headers['--internal-request-id'] as string);
  next();
});

// TODO: API endpoints
api.use("/cards", CardsAPI(database, sessions));
api.use("/buckets", BucketsAPI(database, sessions));
api.use("/free-spaces", FreeSpacesAPI(database, sessions));
api.use("/artworks", ArtworksAPI(database, sessions));
api.use("/sessions", SessionsAPI(database, sessions));
api.use("/history", HistoryAPI(database, sessions));
api.use("/users", UsersAPI(database, sessions));

api.use("/templates/cards", TemplatesCardsAPI(database, sessions));
api.use("/templates/buckets", TemplatesBucketsAPI(database, sessions));
api.use("/templates/free-spaces", TemplatesFreeSpacesAPI(database, sessions));

api.get("/health", (req, res) => {
  res.status(200).json({
    apiStatus: "OK",
    db: database.status,
    time: new Date().toISOString(),
  });
});

api.use(async (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log("aaa");
  if (err instanceof APIError) {
    res.status(err.httpCode).json({
      code: err.code,
      message: err.message,
      explanation: err.explanations,
      requestId: req.headers['--internal-request-id'] as string
    });
  } else {
    const error = new APIError(500, "INTERNAL_ERROR", "An unexpected error occurred. Please try again later.");
    error.addExplanation({
      type: err.constructor.name,
      message: err.message,
      encryptedStack: err.stack ? encryptStack(err.stack, req.headers['--internal-request-id'] as string) : null
    });
    res.status(error.httpCode).json({
      code: error.code,
      message: error.message,
      explanation: error.explanations,
      requestId: req.headers['--internal-request-id'] as string
    });
  }
});

api.listen(80, () => {
  console.log('Nwero Bingo API listening on port 80');
});

/**
 * Encrypts the stack trace of an error using AES-256-GCM.
 * As the stack trace could contain sensitive internal data, we use this to encrypt it in a way that
 * only those with the encryption key (stored in environment variable) *and* the request ID can decrypt it.
 * @param stack The stack trace to encrypt
 * @param reqId The ID of the request that caused the error
 */
function encryptStack(stack: string, reqId: string) {
  let key = Buffer.from(process.env.ERROR_STACK_ENCRYPTION_KEY as string, 'hex');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, Buffer.from(reqId, 'hex'));

  let encrypted = cipher.update(stack, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return Buffer.from(`${encrypted}:${authTag}`).toString('base64');
}