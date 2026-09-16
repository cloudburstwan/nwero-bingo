import express from "express";
import Database from "../database";
import Sessions from "../sessions";
import APIError from "../types/APIError";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import requireSessionMiddleware, { RequestWithSession } from "../utils/RequireSessionMiddleware";
import { checkType } from "../utils/checkType";

export function SessionsAPI(database: Database, sessions: Sessions) {
  const api = express.Router();
  const authorizedUsers = JSON.parse(readFileSync("/data/authorized_users.json", "utf8"));

  api.get("/@me", requireSessionMiddleware(sessions), async (req: RequestWithSession, res) => {
    res.status(200).json(req.session!);
  });

  api.put("/create", express.json(), express.urlencoded({ extended: true }), async (req, res) => {
    checkType("code", req.body.code, "string");

    let tokenRequest = null;
    try {
      tokenRequest = await fetch(`https://discord.com/api/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${process.env.DISCORD_APPLICATION_ID}:${process.env.DISCORD_APPLICATION_SECRET}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: req.body.code,
          redirect_uri: `${process.env.DISCORD_REDIRECT_URI}/api/v1/sessions/create`,
        })
      }).then(async res => Object.assign(await res.json(), { httpStatus: res.status }));
    } catch (err) {
      throw err;
    }

    console.log(tokenRequest);

    if (tokenRequest.httpStatus !== 200) {
      let error = new APIError(500, "DISCORD_OAUTH2_ERROR", "An error occurred while trying to authenticate with Discord.");
      error.addExplanation({
        while: "requesting token",
        requestInfo: tokenRequest
      });
      throw error;
    }

    let userInfo = null;
    try {
      userInfo = await fetch(`https://discord.com/api/v10/users/@me`, {
        headers: {
          "Authorization": `${tokenRequest.token_type} ${tokenRequest.access_token}`,
        }
      }).then(async res => Object.assign(await res.json(), { httpStatus: res.status }));
    } catch (err) {
      throw err;
    }

    console.log(userInfo);

    if (userInfo.httpStatus !== 200) {
      let error = new APIError(500, "DISCORD_OAUTH2_ERROR", "An error occurred while trying to authenticate with Discord.");
      error.addExplanation({
        while: "requesting user info",
        requestInfo: userInfo
      });
      throw error;
    }

    if (authorizedUsers.findIndex((userId: string) => userId === userInfo.id) === -1) {
      throw new APIError(403, "NOT_AUTHORIZED", "You are not authorized to create sessions.");
    }

    let guilds: any = null;
    try {
      guilds = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
        headers: {
          "Authorization": `${tokenRequest.token_type} ${tokenRequest.access_token}`,
        }
      }).then(async res => ({ httpStatus: res.status, guilds: await res.json() }));
    } catch (err) {
      throw err;
    }

    console.log(guilds);

    if (guilds.httpStatus !== 200) {
      let error = new APIError(500, "DISCORD_OAUTH2_ERROR", "An error occurred while trying to authenticate with Discord.");
      error.addExplanation({
        while: "requesting guilds",
        requestInfo: guilds
      });
      throw error;
    }

    if (guilds.guilds.findIndex((guild: any) => guild.id === process.env.DISCORD_GUILD_ID) === -1) {
      throw new APIError(403, "NOT_IN_GUILD", "You are not a member of Neuro-sama Headquarters.");
    }

    let user = null;
    try {
      user = await database.getUserByDiscordId(userInfo.id);
    } catch (err) {
      if (err instanceof ReferenceError) {
        user = await database.createUser(userInfo.global_name ?? userInfo.username, `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png`, userInfo.avatar, userInfo.id)
      } else throw err;
    }

    if (user.avatarHash !== userInfo.avatar) {
      user.avatarHash = userInfo.avatar;
      user.avatarUrl = `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png`;
      await database.updateUser(user);
    }

    let sessionId = randomUUID();
    sessions.create(
      {
        id: sessionId,
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      }
    );

    res.status(200).json({
      sessionId: sessionId,
      expiresIn: (1000*60*60*24*7)-100
    });
  });

  return api;
}