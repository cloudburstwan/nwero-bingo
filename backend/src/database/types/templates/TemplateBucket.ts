import { Pool } from "pg";
import Prompt from "../Prompt";

export default class TemplateBucket {
  private pool: Pool;
  public id: string;
  public name: string;
  public cardId?: string;
  public weight: number;
  public standalone: boolean;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(pool: Pool, id: string, name: string, cardId: string | undefined, weight: number, standalone: boolean, createdAt: Date | undefined, updatedAt: Date | undefined) {
    this.pool = pool;
    this.id = id;
    this.name = name;
    this.cardId = cardId;
    this.weight = weight;
    this.standalone = standalone;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public async getPrompts(): Promise<Prompt[]> {
    const query = `SELECT * FROM templates_prompts WHERE bucket_id = $1`;
    const result = await this.pool.query(query, [this.id]);

    let output = [];
    for (const row of result.rows) {
      output.push(new Prompt(row.id, row.bucket_id, row.prompt, row.description));
    }
    return output;
  }
}