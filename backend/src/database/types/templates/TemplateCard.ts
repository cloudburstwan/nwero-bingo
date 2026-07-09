import { Pool } from "pg";

export default class TemplateCard {
  private pool: Pool;
  public id: string;
  public name: string;
  public description?: string;
  public width: number;
  public height: number;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(pool: Pool, id: string, name: string, description: string | undefined, width: number, height: number, createdAt: Date, updatedAt: Date) {
    this.pool = pool;
    this.id = id;
    this.name = name;
    this.description = description;
    this.width = width;
    this.height = height;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public async getBucketIds(): Promise<{ id: string, name: string }[]> {
    const query = `SELECT id, name FROM templates_buckets WHERE card_id = $1 AND standalone = false`;
    const result = await this.pool.query(query, [this.id]);

    let output = [];
    for (let row of result.rows) {
      output.push({ id: row.id, name: row.name })
    }

    return output;
  }

  public async getFreeSpaceIds(): Promise<{ id: string, name: string }[]> {
    const query = `SELECT id, name FROM templates_free_spaces WHERE card_id = $1`;
    const result = await this.pool.query(query, [this.id]);

    let output = [];
    for (let row of result.rows) {
      output.push({ id: row.id, name: row.name })
    }

    return output;
  }
}