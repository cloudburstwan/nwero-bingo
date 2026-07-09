import { Pool } from "pg";
import Artwork from "./Artwork";

export default class FreeSpace {
  private pool: Pool
  public id: string;
  public cardId: string;
  public artworkId?: string;
  public x: number;
  public y: number;
  public stretch: boolean;

  constructor(pool: Pool, id: string, cardId: string, artworkId: string | undefined, x: number, y: number, stretch: boolean) {
    this.pool = pool;
    this.id = id;
    this.cardId = cardId;
    this.artworkId = artworkId;
    this.x = x;
    this.y = y;
    this.stretch = stretch;
  }

  public async getArtwork(): Promise<Artwork | null> {
    if (!this.artworkId) return null;

    const query = `SELECT * FROM artworks WHERE id = $1 LIMIT 1`;
    const result = await this.pool.query(query, [this.artworkId]);

    if (result.rowCount === 0) throw new ReferenceError(`Artwork with id ${this.artworkId} does not exist`);

    return {
      id: result.rows[0].id,
      src: result.rows[0].src,
      sourceName: result.rows[0].source_name,
      sourceUrl: result.rows[0].source_url,
      uploader: result.rows[0].uploader,
      createdAt: new Date(result.rows[0].created_at),
      updatedAt: new Date(result.rows[0].updated_at),
    }
  }
}