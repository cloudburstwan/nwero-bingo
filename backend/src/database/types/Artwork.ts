export default interface Artwork {
  id: string;
  src: string;
  sourceName: string;
  sourceUrl?: string;
  uploader: string;
  createdAt: Date;
  updatedAt: Date;
}
