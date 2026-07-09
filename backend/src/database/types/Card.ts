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
}