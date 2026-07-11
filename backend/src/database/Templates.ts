import { Pool } from "pg";
import TemplateCard from "./types/templates/TemplateCard";
import TemplateBucket from "./types/templates/TemplateBucket";
import FreeSpace from "./types/FreeSpace";
import Card from "./types/Card";
import { randomUUID } from "node:crypto";
import Bucket from "./types/Bucket";

export default class TemplatesDatabase {
  private readonly pool: Pool

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Gets a list of template cards in the database.
   * @param limit Limit of the number of cards to return.
   * @param offset Offset of the cards to return.
   */
  public async getCardList(limit: number = 20, offset: number = 0): Promise<{ id: string, name: string }[]> {
    const query = `SELECT id, name FROM templates_cards ORDER BY name DESC LIMIT $1 OFFSET $2`;
    const result = await this.pool.query(query, [limit, offset]);

    let output = [];
    for (const row of result.rows) {
      output.push({ id: row.id, name: row.name });
    }

    return output;
  }

  /**
   * Gets a list of template buckets in the database.
   * @param limit Limit of the number of buckets to return.
   * @param offset Offset of the buckets to return.
   */
  public async getBucketList(limit: number = 20, offset: number = 0): Promise<{ id: string, name: string }[]> {
    const query = `SELECT id, name FROM templates_buckets WHERE standalone = true ORDER BY name DESC LIMIT $1 OFFSET $2`;
    const result = await this.pool.query(query, [limit, offset]);

    let output = [];
    for (const row of result.rows) {
      output.push({ id: row.id, name: row.name });
    }

    return output;
  }

  /**
   * Gets a template card by its ID.
   * @param id ID of the card to get.
   * @returns The card with the given ID.
   * @throws ReferenceError If the card does not exist.
   */
  public async getCard(id: string): Promise<TemplateCard> {
    const query = `SELECT * FROM templates_cards WHERE id = $1 LIMIT 1`;
    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) throw new ReferenceError(`Card with id ${id} does not exist`);

    return new TemplateCard(this.pool, result.rows[0].id, result.rows[0].name, result.rows[0].description, result.rows[0].width, result.rows[0].height, new Date(result.rows[0].created_at), new Date(result.rows[0].updated_at));
  }

  /**
   * Creates a new template of the card.
   * @param name Name of the card.
   * @param description Description of the card.
   * @param width Width of the card.
   * @param height Height of the card.
   * @returns The created card template.
   */
  public async createCard(name: string, description: string | undefined, width: number, height: number): Promise<TemplateCard> {
    const card = new TemplateCard(this.pool, randomUUID(), name, description, width, height, new Date(), new Date());

    const query = `INSERT INTO templates_cards (id, name, description, width, height, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    await this.pool.query(query, [card.id, card.name, card.description, card.width, card.height, card.createdAt, card.updatedAt]);

    return card;
  }

  /**
   * Updates a card template in the database.
   * @param card Card to update.
   * @returns The updated card.
   */
  public async updateCard(card: TemplateCard): Promise<TemplateCard> {
    const query = `UPDATE templates_cards SET name = $1, description = $2, width = $3, height = $4, updated_at = $5 WHERE id = $6`;
    await this.pool.query(query, [card.name, card.description, card.width, card.height, new Date(), card.id]);

    card.updatedAt = new Date();

    return card;
  }

  /**
   * Deletes a card template from the database.
   * @param card Card to delete.
   */
  public async deleteCard(card: TemplateCard): Promise<void> {
    const query = `DELETE FROM templates_cards WHERE id = $1`;
    await this.pool.query(query, [card.id]);

    let bucketIds = await card.getBucketIds();
    for (let bucketId of bucketIds) {
      const query = `DELETE FROM templates_buckets WHERE id = $1`;
      await this.pool.query(query, [bucketId]);

      const query2 = `DELETE FROM templates_prompts WHERE bucket_id = $1`;
      await this.pool.query(query2, [bucketId]);
    }

    let freeSpaceIds = await card.getFreeSpaceIds();
    for (let freeSpaceId of freeSpaceIds) {
      const query = `DELETE FROM templates_free_spaces WHERE id = $1`;
      await this.pool.query(query, [freeSpaceId]);
    }
  }

  /**
   * Gets a template bucket by its ID.
   * @param id ID of the bucket to get.
   * @returns The bucket with the given ID.
   * @throws ReferenceError If the bucket does not exist.
   */
  public async getBucket(id: string): Promise<TemplateBucket> {
    const query = `SELECT * FROM templates_buckets WHERE id = $1 LIMIT 1`;
    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) throw new ReferenceError(`Bucket with id ${id} does not exist`);

    return new TemplateBucket(this.pool, result.rows[0].id, result.rows[0].name, result.rows[0].card_id, result.rows[0].weight, result.rows[0].standalone, result.rows[0].created_at != undefined ? new Date(result.rows[0].created_at) : undefined, result.rows[0].updated_at != undefined ? new Date(result.rows[0].updated_at) : undefined);
  }

  /**
   * Creates a new bucket template (that is part of a card template) in the database.
   * @param name Name of the bucket.
   * @param cardId ID of the card this bucket belongs to.
   * @param weight Weight of the bucket.
   * @returns The created bucket.
   */
  public async createBucket(name: string, cardId: string, weight: number): Promise<TemplateBucket> {
    const bucket = new TemplateBucket(this.pool, randomUUID(), name, cardId, weight, false, undefined, undefined);

    const query = `INSERT INTO templates_buckets (id, name, card_id, weight, standalone, created_at, updated_at) VALUES ($1, $2, $3, $4, FALSE, NULL, NULL)`;
    await this.pool.query(query, [bucket.id, bucket.name, bucket.cardId, bucket.weight]);

    let card = await this.getCard(cardId);
    await this.updateCard(card);

    return bucket;
  }

  /**
   * Creates a new bucket template (that is not part of a card template) in the database.
   * @param name Name of the bucket.
   * @param weight Weight of the bucket.
   * @returns The created bucket.
   */
  public async createStandaloneBucket(name: string, weight: number): Promise<TemplateBucket> {
    const bucket = new TemplateBucket(this.pool, randomUUID(), name, undefined, weight, true, new Date(), new Date());

    const query = `INSERT INTO templates_buckets (id, name, card_id, weight, standalone, created_at, updated_at) VALUES ($1, $2, NULL, $3, TRUE, $4, $5)`;
    await this.pool.query(query, [bucket.id, bucket.name, bucket.weight, bucket.createdAt, bucket.updatedAt]);

    return bucket;
  }

  /**
   * Updates a bucket in the database.
   * @param bucket Bucket to update.
   * @returns The updated bucket.
   */
  public async updateBucket(bucket: TemplateBucket): Promise<TemplateBucket> {
    const query = `UPDATE templates_buckets SET name = $1, weight = $2 WHERE id = $4`;
    await this.pool.query(query, [bucket.name, bucket.weight, bucket.id]);

    if (bucket.standalone) {
      const query = `UPDATE templates_buckets SET updated_at = $1 WHERE id = $2`;
      await this.pool.query(query, [new Date(), bucket.id]);
    } else {
      let card = await this.getCard(bucket.cardId!);
      await this.updateCard(card);
    }

    return bucket;
  }

  /**
   * Deletes a bucket from the database.
   * @param bucket Bucket to delete.
   */
  public async deleteBucket(bucket: TemplateBucket): Promise<void> {
    const query = `DELETE FROM templates_buckets WHERE id = $1`;
    await this.pool.query(query, [bucket.id]);

    const query2 = `DELETE FROM templates_prompts WHERE bucket_id = $1`;
    await this.pool.query(query2, [bucket.id]);

    if (!bucket.standalone) {
      let card = await this.getCard(bucket.cardId!);
      await this.updateCard(card);
    }
  }

  /**
   * Gets a free space by its ID.
   * @param id ID of the free space to get.
   * @returns The free space with the given ID.
   * @throws ReferenceError If the free space does not exist.
   */
  public async getFreeSpace(id: string): Promise<FreeSpace> {
    const query = `SELECT * FROM templates_free_spaces WHERE id = $1 LIMIT 1`;
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

    const query = `INSERT INTO templates_free_spaces (id, card_id, artwork_id, x, y, stretch) VALUES ($1, $2, $3, $4, $5, $6)`;
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
    const query = `UPDATE templates_free_spaces SET artwork_id = $2, x = $3, y = $4, stretch = $5 WHERE id = $6`;
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
    const query = `DELETE FROM templates_free_spaces WHERE id = $1`;
    await this.pool.query(query, [freeSpace.id]);

    let card = await this.getCard(freeSpace.cardId);
    await this.updateCard(card);
  }
}