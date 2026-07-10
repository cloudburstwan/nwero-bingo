import { Pool } from "pg";
import Migration from "./types/Migration";
import TemplatesDatabase from "./Templates";
import FreeSpace from "./types/FreeSpace";
import Card from "./types/Card";
import Bucket from "./types/Bucket";
import ArchivedCard from "./types/ArchivedCard";
import Artwork from "./types/Artwork";
import { randomUUID } from "node:crypto";
import User from "./types/User";
import History, { HistoryAction } from "./types/History";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import Prompt from "./types/Prompt";

export default class Database {
  private pool: Pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
  });

  constructor() {
    this.pool.connect().then(async (client) => {
      if (this.pool.totalCount <= 1) {
        let recentMigration = await this.getMostRecentMigration();
        console.log(`Connected to database. Most recent migration: ${recentMigration?.name ?? "none"}`);

        let appliedMigrations = await this.getMigrations();
        let allMigrations = readdirSync("/postgres/").filter(file => file.endsWith(".sql"));
        let unappliedMigrations = allMigrations.filter(fileName => {
          let migrationName = fileName.split(".")[1];
          return !appliedMigrations.some(migration => migration.name === migrationName);
        });

        if (unappliedMigrations.length > 0) {
          console.log(`Found ${unappliedMigrations.length} unapplied migrations. Applying in order...`);
          let sortedMigrations = unappliedMigrations.sort((a, b) => {
            let migrationDateA = parseInt(a.split(".")[0]);
            let migrationDateB = parseInt(b.split(".")[0]);

            if (isNaN(migrationDateA) && isNaN(migrationDateB)) return 0;
            if (isNaN(migrationDateA)) return 1;
            if (isNaN(migrationDateB)) return -1;

            return migrationDateA - migrationDateB;
          });

          for (let migration of sortedMigrations) {
            let migrationName = migration.split(".")[1];
            console.log(`Applying migration ${migrationName} (created ${migration.split(".")[0]})...`);
            let migrationQuery = readFileSync(`/postgres/${migration}`, "utf8");
            await this.pool.query(migrationQuery);
            await this.addMigration(migrationName);
          }
        }
      }
    });
  }

  public templates: TemplatesDatabase = new TemplatesDatabase(this.pool);

  public get status() {
    return {
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      expired: this.pool.expiredCount,
      total: this.pool.totalCount,
    }
  }

  /**
   * Gets a list of completed database migrations.
   */
  public async getMigrations(): Promise<Migration[]> {
    const query = `SELECT * FROM migrations ORDER BY applied_at ASC`;
    const result = await this.pool.query(query);

    let output = [];
    for (const row of result.rows) {
      output.push({
        name: row.name,
        appliedAt: new Date(row.applied_at),
      } as Migration);
    }

    return output;
  }

  /**
   * Gets the most recent database migration.
   * @returns The most recent migration, or undefined if there are no migrations.
   */
  public async getMostRecentMigration(): Promise<Migration | undefined> {
    const query = `SELECT * FROM migrations ORDER BY applied_at DESC LIMIT 1`;
    const result = await this.pool.query(query);

    if (result.rowCount === 0) return undefined;

    return {
      name: result.rows[0].name,
      appliedAt: new Date(result.rows[0].applied_at),
    } as Migration;
  }

  /**
   * Adds a new database migration.
   * @param name Name of the migration.
   */
  public async addMigration(name: string): Promise<void> {
    const query = `INSERT INTO migrations (name, applied_at) VALUES ($1, $2)`;
    await this.pool.query(query, [name, new Date()]);
  }

  /**
   * Gets the action history
   * @param limit Limit of the amount of history to return.
   * @param offset Offset of the history to return.
   * @returns The history.
   */
  public async getHistory(limit: number = 20, offset: number = 0): Promise<History[]> {
    const query = `SELECT * FROM history ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
    const result = await this.pool.query(query, [limit, offset]);

    let output = [];
    for (let row of result.rows) {
      output.push({
        id: row.id,
        userId: row.user_id,
        table: row.table,
        action: row.action,
        primaryKey: row.primary_key,
        data: row.data,
        createdAt: new Date(row.created_at),
      })
    }
    return output;
  }

  /**
   * Adds a new action history to the database.
   * @param userId The user who took the action.
   * @param table The table the action was made on.
   * @param action The action that was taken.
   * @param primaryKey The primary key of the table the action was made on.
   * @param data Additional data associated with this action.
   * @returns The created history.
   */
  public async addHistory(userId: string, table: string, action: HistoryAction, primaryKey: string, data: any) {
    const history = {
      id: randomUUID(),
      userId: userId,
      table: table,
      action: action,
      primaryKey: primaryKey,
      data: data,
      createdAt: new Date(),
    }

    const query = `INSERT INTO history (id, user_id, "table", action, primary_key, data, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    await this.pool.query(query, [history.id, history.userId, history.table, history.action, history.primaryKey, history.data, history.createdAt]);

    return history;
  }

  /**
   * Gets a user by their ID.
   * @param id ID of the user to get.
   * @returns The user with the given ID.
   * @throws ReferenceError If the user does not exist.
   */
  public async getUser(id: string): Promise<User> {
    const query = `SELECT * FROM users WHERE id = $1 LIMIT 1`;
    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) throw new ReferenceError(`User with id ${id} does not exist`);

    return {
      id: result.rows[0].id,
      username: result.rows[0].username,
      avatarUrl: result.rows[0].avatar_url,
      avatarHash: result.rows[0].avatar_hash,
      discordId: result.rows[0].discord_id
    }
  }

  /**
   * Gets a user by their Discord ID.
   * @param id Discord ID of the user to get.
   * @returns The user with the given Discord ID.
   * @throws ReferenceError If the user does not exist.
   */
  public async getUserByDiscordId(id: string): Promise<User> {
    const query = `SELECT * FROM users WHERE discord_id = $1 LIMIT 1`;
    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) throw new ReferenceError(`User with id ${id} does not exist`);

    return {
      id: result.rows[0].id,
      username: result.rows[0].username,
      avatarUrl: result.rows[0].avatar_url,
      avatarHash: result.rows[0].avatar_hash,
      discordId: result.rows[0].discord_id
    }
  }

  /**
   * Creates a new user in the database.
   * @param username Username of the user.
   * @param avatar_url Avatar URL of the user.
   * @param avatar_hash Avatar hash of the user.
   * @param discord_id Discord ID of the user.
   * @returns The created user.
   */
  public async createUser(username: string, avatar_url: string | undefined, avatar_hash: string | undefined, discord_id: string): Promise<User> {
    const user = {
      id: randomUUID(),
      username: username,
      avatarUrl: avatar_url,
      avatarHash: avatar_hash,
      discordId: discord_id
    }

    const query = `INSERT INTO users (id, username, avatar_url, avatar_hash, discord_id) VALUES ($1, $2, $3, $4, $5)`;
    await this.pool.query(query, [user.id, user.username, user.avatarUrl, user.avatarHash, user.discordId]);

    return user;
  }

  /**
   * Updates a user in the database.
   * @param user User to update.
   * @returns The updated user.
   */
  public async updateUser(user: User): Promise<User> {
    const query = `UPDATE users SET username = $1, avatar_url = $2, avatar_hash = $3 WHERE id = $4`;
    await this.pool.query(query, [user.username, user.avatarUrl, user.avatarHash, user.id]);

    return user;
  }

  /**
   * Gets a list of cards in the database.
   * @param limit Limit of the number of cards to return.
   * @param offset Offset of the cards to return.
   */
  public async getCardList(limit: number = 20, offset: number = 0): Promise<{ id: string, name: string, date: Date }[]> {
    const query = `SELECT id, name, date FROM cards ORDER BY date DESC`;
    const result = await this.pool.query(query);

    let output = [];
    for (const row of result.rows) {
      output.push({ id: row.id, name: row.name, date: new Date(row.date) });
    }

    return output;
  }

  /**
   * Gets a card by its ID.
   * @param id ID of the card to get.
   * @returns The card with the given ID.
   * @throws ReferenceError If the card does not exist.
   */
  public async getCard(id: string): Promise<Card> {
    const query = `SELECT * FROM cards WHERE id = $1 LIMIT 1 `;
    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) throw new ReferenceError(`Card with id ${id} does not exist`);

    return new Card(this.pool, result.rows[0].id, result.rows[0].name, result.rows[0].description, new Date(result.rows[0].date), result.rows[0].width, result.rows[0].height, new Date(result.rows[0].created_at), new Date(result.rows[0].updated_at));
  }

  /**
   * Creates a new card in the database.
   * @param name Name of the card.
   * @param description Description of the card.
   * @param date Date of the stream this card is for
   * @param width Width of the card.
   * @param height Height of the card.
   * @returns The created card.
   */
  public async createCard(name: string, description: string | undefined, date: Date, width: number, height: number): Promise<Card> {
    const card = new Card(this.pool, randomUUID(), name, description, date, width, height, new Date(), new Date());

    const query = `INSERT INTO cards (id, name, description, date, width, height, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
    await this.pool.query(query, [card.id, card.name, card.description, card.date, card.width, card.height, card.createdAt, card.updatedAt]);

    return card;
  }

  /**
   * Updates a card in the database.
   * @param card Card to update.
   * @returns The updated card.
   */
  public async updateCard(card: Card): Promise<Card> {
    const query = `UPDATE cards SET name = $1, description = $2, date = $3, width = $4, height = $5, updated_at = $6 WHERE id = $7`;
    await this.pool.query(query, [card.name, card.description, card.date, card.width, card.height, new Date(), card.id]);

    card.updatedAt = new Date();

    return card;
  }

  /**
   * Deletes a card from the database.
   * @param card Card to delete.
   */
  public async deleteCard(card: Card): Promise<void> {
    const query = `DELETE FROM cards WHERE id = $1`;
    await this.pool.query(query, [card.id]);

    let bucketIds = await card.getBucketIds();
    for (let bucketId of bucketIds) {
      const query = `DELETE FROM buckets WHERE id = $1`;
      await this.pool.query(query, [bucketId]);

      const query2 = `DELETE FROM prompts WHERE bucket_id = $1`;
      await this.pool.query(query2, [bucketId]);
    }

    let freeSpaceIds = await card.getFreeSpaceIds();
    for (let freeSpaceId of freeSpaceIds) {
      const query = `DELETE FROM free_spaces WHERE id = $1`;
      await this.pool.query(query, [freeSpaceId]);
    }
  }

  /**
   * Archives the card and all of its buckets and free spaces.
   * @param card Card to archive.
   * @returns The archived card.
   * @throws ReferenceError If a referenced bucket or free space does not exist.
   */
  public async archiveCard(card: Card): Promise<ArchivedCard> {
    let exportData: any = {
      id: card.id,
      name: card.name,
      description: card.description,
      date: card.date,
      width: card.width,
      height: card.height,
      buckets: [],
      freeSpaces: []
    };

    let bucketIds = await card.getBucketIds();
    for (let bucketId of bucketIds) {
      let bucket = await this.getBucket(bucketId);
      exportData.buckets.push({
        id: bucket.id,
        name: bucket.name,
        weight: bucket.weight,
        prompts: (await bucket.getPrompts())
      });
    }

    let freeSpaceIds = await card.getFreeSpaceIds();
    for (let freeSpaceId of freeSpaceIds) {
      let freeSpace = await this.getFreeSpace(freeSpaceId);
      let artwork = freeSpace.artworkId ? (await freeSpace.getArtwork()) : null;
      exportData.freeSpaces.push({
        id: freeSpace.id,
        artwork: artwork ? {
          id: artwork.id,
          src: artwork.src,
          sourceName: artwork.sourceName,
          sourceUrl: artwork.sourceUrl,
        } : null,
        x: freeSpace.x,
        y: freeSpace.y,
        stretch: freeSpace.stretch
      });
    }

    writeFileSync(`/archived-cards/${exportData.id}.json`, JSON.stringify(exportData, null, 2));

    await this.deleteCard(card);
    return await this.createArchivedCard(exportData.id, exportData.name, exportData.date);
  }

  /**
   * Gets a list of archived cards in the database.
   * @param limit Limit of the number of archived cards to return.
   * @param offset Offset of the archived cards to return.
   */
  public async getArchivedCardList(limit: number = 20, offset: number = 0): Promise<ArchivedCard[]> {
    const query = `SELECT * FROM archived_cards ORDER BY date DESC LIMIT $1 OFFSET $2`;
    const result = await this.pool.query(query, [limit, offset]);

    let output = [];
    for (const row of result.rows) {
      output.push(new ArchivedCard(row.id, row.name, new Date(row.date), new Date(row.archived_at)));
    }

    return output;
  }

  /**
   * Gets an archived card by its ID.
   * @param id ID of the archived card to get.
   * @returns The archived card with the given ID.
   * @throws ReferenceError If the archived card does not exist.
   */
  public async getArchivedCard(id: string): Promise<ArchivedCard> {
    const query = `SELECT * FROM archived_cards WHERE id = $1 LIMIT 1`;
    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) throw new ReferenceError(`Archived card with id ${id} does not exist`);

    return new ArchivedCard(result.rows[0].id, result.rows[0].name, new Date(result.rows[0].date), new Date(result.rows[0].archived_at));
  }

  public async createArchivedCard(id: string, name: string, date: Date): Promise<ArchivedCard> {
    const archivedCard = new ArchivedCard(id, name, date, new Date());

    const query = `INSERT INTO archived_cards (id, name, date, archived_at) VALUES ($1, $2, $3, $4)`;
    await this.pool.query(query, [archivedCard.id, archivedCard.name, archivedCard.date, archivedCard.archivedAt]);

    return archivedCard;
  }

  /**
   * Gets a bucket by its ID.
   * @param id ID of the bucket to get.
   * @returns The bucket with the given ID.
   * @throws ReferenceError If the bucket does not exist.
   */
  public async getBucket(id: string): Promise<Bucket> {
    const query = `SELECT * FROM buckets WHERE id = $1 LIMIT 1`;
    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) throw new ReferenceError(`Bucket with id ${id} does not exist`);

    return new Bucket(this.pool, result.rows[0].id, result.rows[0].name, result.rows[0].card_id, result.rows[0].weight);
  }

  /**
   * Creates a new bucket in the database.
   * @param name Name of the bucket.
   * @param cardId ID of the card this bucket belongs to.
   * @param weight Weight of the bucket.
   * @returns The created bucket.
   */
  public async createBucket(name: string, cardId: string, weight: number): Promise<Bucket> {
    const bucket = new Bucket(this.pool, randomUUID(), name, cardId, weight);

    const query = `INSERT INTO buckets (id, name, card_id, weight) VALUES ($1, $2, $3, $4)`;
    await this.pool.query(query, [bucket.id, bucket.name, bucket.cardId, bucket.weight]);

    let card = await this.getCard(cardId);
    await this.updateCard(card);

    return bucket;
  }

  /**
   * Updates a bucket in the database.
   * @param bucket Bucket to update.
   * @returns The updated bucket.
   */
  public async updateBucket(bucket: Bucket): Promise<Bucket> {
    const query = `UPDATE buckets SET name = $1, weight = $2 WHERE id = $3`;
    await this.pool.query(query, [bucket.name, bucket.weight, bucket.id]);

    let card = await this.getCard(bucket.cardId);
    await this.updateCard(card);

    return bucket;
  }

  /**
   * Deletes a bucket from the database.
   * @param bucket Bucket to delete.
   */
  public async deleteBucket(bucket: Bucket): Promise<void> {
    const query = `DELETE FROM buckets WHERE id = $1`;
    await this.pool.query(query, [bucket.id]);

    const query2 = `DELETE FROM prompts WHERE bucket_id = $1`;
    await this.pool.query(query2, [bucket.id]);

    let card = await this.getCard(bucket.cardId);
    await this.updateCard(card);
  }

  /**
   * Gets a prompt by its ID.
   * @param id ID of the prompt to get.
   * @returns The prompt with the given ID.
   * @throws ReferenceError If the prompt does not exist.
   */
  public async getPrompt(id: string): Promise<Prompt> {
    const query = `SELECT * FROM prompts WHERE id = $1 LIMIT 1`;
    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) throw new ReferenceError(`Prompt with id ${id} does not exist`);

    return {
      id: result.rows[0].id,
      bucketId: result.rows[0].bucket_id,
      prompt: result.rows[0].prompt,
      description: result.rows[0].description,
    }
  }

  /**
   * Creates a new prompt in the database.
   * @param bucketId ID of the bucket this prompt belongs to.
   * @param prompt Name of the prompt.
   * @param description Description of the prompt.
   * @returns The created prompt.
   */
  public async createPrompt(bucketId: string, prompt: string, description?: string) {
    let entity = {
      id: randomUUID(),
      bucketId: bucketId,
      prompt: prompt,
      description: description,
    }

    const query = `INSERT INTO prompts (id, bucket_id, prompt, description) VALUES ($1, $2, $3, $4)`;
    await this.pool.query(query, [entity.id, entity.bucketId, entity.prompt, entity.description]);

    let bucket = await this.getBucket(entity.bucketId);
    let card = await this.getCard(bucket.cardId);
    await this.updateCard(card);

    return entity;
  }

  /**
   * Updates a prompt in the database.
   * @param prompt Prompt to update.
   * @returns The updated prompt.
   */
  public async updatePrompt(prompt: Prompt): Promise<Prompt> {
    const query = `UPDATE prompts SET prompt = $1, description = $2 WHERE id = $3`;
    await this.pool.query(query, [prompt.prompt, prompt.description, prompt.id]);

    let bucket = await this.getBucket(prompt.bucketId);
    let card = await this.getCard(bucket.cardId);
    await this.updateCard(card);

    return prompt;
  }

  /**
   * Deletes a prompt from the database.
   * @param prompt
   */
  public async deletePrompt(prompt: Prompt): Promise<void> {
    const query = `DELETE FROM prompts WHERE id = $1`;
    await this.pool.query(query, [prompt.id]);

    let bucket = await this.getBucket(prompt.bucketId);
    let card = await this.getCard(bucket.cardId);
    await this.updateCard(card);
  }

  /**
   * Gets a free space by its ID.
   * @param id ID of the free space to get.
   * @returns The free space with the given ID.
   * @throws ReferenceError If the free space does not exist.
   */
  public async getFreeSpace(id: string): Promise<FreeSpace> {
    const query = `SELECT * FROM free_spaces WHERE id = $1 LIMIT 1`;
    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) throw new ReferenceError(`Free space with id ${id} does not exist`);

    return new FreeSpace(this.pool, result.rows[0].id, result.rows[0].card_id, result.rows[0].artwork_id, result.rows[0].x, result.rows[0].y, result.rows[0].stretch);
  }

  /**
   * Creates a new free space in the database.
   * @param cardId ID of the card this free space belongs to.
   * @param artworkId ID of the artwork this free space is using
   * @param x X position of the free space.
   * @param y Y position of the free space.
   * @param stretch Whether the artwork is stretched to fit this free space.
   * @returns The created free space.
   */
  public async createFreeSpace(cardId: string, artworkId: string | undefined, x: number, y: number, stretch: boolean) {
    const freeSpace = new FreeSpace(this.pool, randomUUID(), cardId, artworkId, x, y, stretch);

    const query = `INSERT INTO free_spaces (id, card_id, artwork_id, x, y, stretch) VALUES ($1, $2, $3, $4, $5, $6)`;
    await this.pool.query(query, [freeSpace.id, freeSpace.cardId, freeSpace.artworkId, freeSpace.x, freeSpace.y, freeSpace.stretch]);

    let card = await this.getCard(cardId);
    await this.updateCard(card);

    return freeSpace;
  }

  /**
   * Updates a free space in the database.
   * @param freeSpace Free space to update.
   * @returns The updated free space.
   */
  public async updateFreeSpace(freeSpace: FreeSpace): Promise<FreeSpace> {
    const query = `UPDATE free_spaces SET artwork_id = $1, x = $2, y = $3, stretch = $4 WHERE id = $5`;
    await this.pool.query(query, [freeSpace.artworkId, freeSpace.x, freeSpace.y, freeSpace.stretch, freeSpace.id]);

    let card = await this.getCard(freeSpace.cardId);
    await this.updateCard(card);

    return freeSpace;
  }

  /**
   * Deletes a free space from the database.
   * @param freeSpace Free space to delete.
   */
  public async deleteFreeSpace(freeSpace: FreeSpace): Promise<void> {
    const query = `DELETE FROM free_spaces WHERE id = $1`;
    await this.pool.query(query, [freeSpace.id]);

    let card = await this.getCard(freeSpace.cardId);
    await this.updateCard(card);
  }

  /**
   * Gets a list of artworks in the database.
   * @param limit Limit of the number of artworks to return.
   * @param offset Offset of the artworks to return.
   */
  public async getArtworks(limit: number = 20, offset: number = 0): Promise<Artwork[]> {
    const query = `SELECT * FROM artworks ORDER BY id DESC LIMIT $1 OFFSET $2`;
    const result = await this.pool.query(query, [limit, offset]);

    let output = [];
    for (const row of result.rows) {
      output.push({
        id: row.id,
        src: row.src,
        sourceName: row.source_name,
        sourceUrl: row.source_url,
        uploader: row.uploader,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      });
    }

    return output;
  }

  /**
   * Gets an artwork by its ID.
   * @param id ID of the artwork to get.
   * @returns The artwork with the given ID.
   * @throws ReferenceError If the artwork does not exist.
   */
  public async getArtwork(id: string): Promise<Artwork> {
    const query = `SELECT * FROM artworks WHERE id = $1 LIMIT 1`;
    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) throw new ReferenceError(`Artwork with id ${id} does not exist`);

    return {
      id: result.rows[0].id,
      src: result.rows[0].src,
      sourceName: result.rows[0].source_name,
      sourceUrl: result.rows[0].source_url,
      uploader: result.rows[0].uploader,
      createdAt: new Date(result.rows[0].created_at),
      updatedAt: new Date(result.rows[0].updated_at)
    };
  }

  /**
   * Creates a new artwork in the database.
   * @param id ID of the artwork.
   * @param src Image source of the artwork.
   * @param sourceName Name of the artist of the artwork.
   * @param sourceUrl URL of the artist of the artwork.
   * @param uploader ID of the user who uploaded the artwork.
   * @returns The created artwork.
   */
  public async createArtwork(id: string, src: string, sourceName: string, sourceUrl: string | undefined, uploader: string): Promise<Artwork> {
    const query = `INSERT INTO artworks (id, src, source_name, source_url, uploader, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $6)`;
    await this.pool.query(query, [id, src, sourceName, sourceUrl, uploader, new Date()]);

    return {
      id: id,
      src: src,
      sourceName: sourceName,
      sourceUrl: sourceUrl,
      uploader: uploader,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Updates an artwork in the database.
   * @param artwork Artwork to update.
   * @returns The updated artwork.
   */
  public async updateArtwork(artwork: Artwork): Promise<Artwork> {
    const query = `UPDATE artworks SET src = $1, source_name = $2, source_url = $3, updated_at = $4 WHERE id = $5`;
    await this.pool.query(query, [artwork.src, artwork.sourceName, artwork.sourceUrl, new Date(), artwork.id]);

    return artwork;
  }

  /**
   * Deletes an artwork from the database.
   * @param artwork Artwork to delete.
   */
  public async deleteArtwork(artwork: Artwork): Promise<void> {
    const query = `DELETE FROM artworks WHERE id = $1`;
    await this.pool.query(query, [artwork.id]);

    const query2 = `UPDATE free_spaces SET artwork_id = NULL WHERE artwork_id = $1`;
    await this.pool.query(query2, [artwork.id]);

    const query3 = `UPDATE templates_free_spaces SET artwork_id = NULL WHERE artwork_id = $1`;
    await this.pool.query(query3, [artwork.id]);
  }
}