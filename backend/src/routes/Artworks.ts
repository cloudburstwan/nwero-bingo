import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import APIError from "../types/APIError";
import requireSessionMiddleware from "../utils/RequireSessionMiddleware";
import formData from "express-form-data";
import { batchCheckType } from "../utils/checkType";
import * as os from "node:os";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export function ArtworksAPI(database: Database, sessions: Sessions) {
  const api = express.Router();
  const tempDir = `${os.tmpdir()}/nwero-bingo-uploads`;

  mkdirSync(tempDir, { recursive: true });

  api.get("/", express.urlencoded({ extended: true }), requireSessionMiddleware(sessions), async (req, res) => {
    let limit = parseInt(req.query.limit as string || "20");
    if (isNaN(limit)) limit = 20;
    let offset = parseInt(req.query.offset as string || "0");
    if (isNaN(offset)) offset = 0;

    let artworks = await database.getArtworks(limit, offset);
    res.status(200).json(artworks);
  });

  api.get("/:id", express.urlencoded({ extended: true }), requireSessionMiddleware(sessions), async (req, res) => {
    try {
      let artwork = await database.getArtwork(req.params.id as string);
      res.status(200).json(artwork);
    } catch (err) {
      if (err instanceof ReferenceError)
        throw new APIError(404, "ARTWORK_NOT_FOUND", `Could not find an artwork with the id ${req.params.id}.`);
      else throw err;
    }
  });

  api.put("/", formData.parse({ uploadDir: tempDir, autoClean: true }), requireSessionMiddleware(sessions), async (req: RequestWithFiles, res: express.Response) => {
    let { checkType, completeBatch } = batchCheckType();
    checkType("file", req.files?.file, "object");
    checkType("file.path", req.files?.file?.path, "string");
    checkType("file.type", req.files?.file?.type, "string");
    checkType("sourceName", req.body.sourceName, "string");
    checkType("sourceUrl", req.body.sourceUrl, "string", true);
    completeBatch();

    let sessionId = req.header("Authorization")!.replace("Bearer ", "");
    let session = sessions.get(sessionId)!;

    if (!req.files?.file?.type.startsWith("image/"))
      throw new APIError(400, "INVALID_FILE_TYPE", "Only image files are allowed.");

    let id = randomUUID();
    let fileName = `${id}.${req.files?.file?.path.split(".")[req.files?.file?.path.split(".").length-1]}`;

    sharp(req.files?.file?.path)
      .resize(300, null)
      .toFile(`/artworks/${fileName}`);

    let artwork = await database.createArtwork(id, `/artworks/${fileName}`, req.body.sourceName, req.body.sourceUrl, session.userId);

    res.status(200).json(artwork);
  });

  // TODO: Update artwork (requires session) - Will require file upload handling

  // TODO: Delete artwork (requires session)

  return api;
}

type RequestWithFiles = express.Request & { files?: { [key: string]: File } };

interface File {
  fieldName: string,
  originalFilename: string,
  path: string,
  headers: { [key: string]: string },
  size: number,
  name: string,
  type: string,
}