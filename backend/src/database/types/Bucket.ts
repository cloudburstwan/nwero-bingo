import { Pool } from "pg";
import Prompt from "./Prompt";

export default class Bucket {
  private pool: Pool;
  public id: string;
  public name: string;
  public cardId: string;
  public weight: number;

  constructor(pool: Pool, id: string, name: string, cardId: string, weight: number) {
    this.pool = pool;
    this.id = id;
    this.name = name;
    this.cardId = cardId;
    this.weight = weight;
  }

  public async getPrompts(): Promise<Prompt[]> {
    const query = `SELECT * FROM prompts WHERE bucket_id = $1`;
    const result = await this.pool.query(query, [this.id]);

    let output = [];
    for (const row of result.rows) {
      output.push(new Prompt(row.id, row.bucket_id, row.prompt, row.description));
    }

    return output;
  }
}