import { Pool } from "pg";
import ArchivedCardFull from "../../types/ArchivedCardFull";

export default class TemplateCard {
  private pool: Pool;
  public id: string;
  public name: string;
  public description?: string;
  public date: Date;
  public width: number;
  public height: number;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(pool: Pool, id: string, name: string, description: string | undefined, date: Date, width: number, height: number, createdAt: Date, updatedAt: Date) {
    this.pool = pool;
    this.id = id;
    this.name = name;
    this.description = description;
    this.date = date;
    this.width = width;
    this.height = height;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public async getBucketIds(): Promise<string[]> {
    const query = `SELECT id FROM buckets WHERE card_id = $1`;
    const result = await this.pool.query(query, [this.id]);

    let output = [];
    for (let row of result.rows) {
      output.push(row.id)
    }

    return output;
  }

  public async getFreeSpaceIds(): Promise<string[]> {
    const query = `SELECT id FROM free_spaces WHERE card_id = $1`;
    const result = await this.pool.query(query, [this.id]);
    
    let output = [];
    for (let row of result.rows) {
      output.push(row.id)
    }

    return output;
  }

  /**
   * Archives the card and all of its buckets and free spaces.
   * @returns The archived card.
   * @throws ReferenceError If a referenced bucket or free space does not exist.
   */
  public async archive(): Promise<ArchivedCardFull> {
    let exportedCard: ArchivedCardFull = {
      id: this.id,
      name: this.name,
      description: this.description,
      date: this.date,
      width: this.width,
      height: this.height,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      buckets: [],
      freeSpaces: [],
    }

    let bucketIds = await this.getBucketIds();
    for (let bucketId of bucketIds) {
      const query = `SELECT * FROM buckets LIMIT 1 WHERE id = $1`;
      const result = await this.pool.query(query, [bucketId]);

      if (result.rowCount === 0) throw new ReferenceError(`Bucket with id ${bucketId} does not exist`);

      let bucket = result.rows[0];
      exportedCard.buckets.push({
        id: bucket.id,
        name: bucket.name,
        weight: bucket.weight,
        prompts: [],
      });

      const query2 = `SELECT * FROM prompts WHERE bucket_id = $1`;
      const result2 = await this.pool.query(query2, [bucketId]);

      for (let row of result2.rows) {
        exportedCard.buckets[exportedCard.buckets.length - 1].prompts.push({
          id: row.id,
          prompt: row.prompt,
          description: row.description,
        });
      }

      await this.pool.query(`DELETE FROM buckets WHERE id = $1`, [bucketId]);
      await this.pool.query(`DELETE FROM prompts WHERE bucket_id = $1`, [bucketId]);
    }

    let freeSpaceIds = await this.getFreeSpaceIds();
    for (let freeSpaceId of freeSpaceIds) {
      const query = `SELECT * FROM free_spaces LIMIT 1 WHERE id = $1`;
      const result = await this.pool.query(query, [freeSpaceId]);

      if (result.rowCount === 0) throw new ReferenceError(`Free Space with id ${freeSpaceId} does not exist`);

      let artwork = undefined;
      if (result.rows[0].artwork_id != null) {
        const query2 = `SELECT * FROM artworks LIMIT 1 WHERE id = $1`;
        const result2 = await this.pool.query(query2, [result.rows[0].artwork_id]);

        if (result2.rowCount === 0) throw new ReferenceError(`Artwork with id ${result.rows[0].artwork_id} does not exist`);

        artwork = {
          id: result2.rows[0].id,
          src: result2.rows[0].src,
          sourceName: result2.rows[0].source_name,
          sourceUrl: result2.rows[0].source_url,
        }
      }

      let freeSpace = result.rows[0];
      exportedCard.freeSpaces.push({
        id: freeSpace.id,
        artwork: artwork,
        x: freeSpace.x,
        y: freeSpace.y,
        stretch: freeSpace.stretch,
      });

      await this.pool.query(`DELETE FROM free_spaces WHERE id = $1`, [freeSpaceId]);
    }

    return exportedCard;
  }
}