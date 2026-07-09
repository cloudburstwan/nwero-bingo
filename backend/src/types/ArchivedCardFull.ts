export default interface ArchivedCardFull {
  id: string;
  name: string;
  description?: string;
  date: Date;
  width: number;
  height: number;
  createdAt: Date;
  updatedAt: Date;
  freeSpaces: {
    id: string;
    artwork?: {
      id: string;
      src: string;
      sourceName: string;
      sourceUrl?: string;
    };
    x: number;
    y: number;
    stretch: boolean;
  }[],
  buckets: {
    id: string;
    name: string;
    weight: number;
    prompts: {
      id: string;
      prompt: string;
      description?: string;
    }[]
  }[]
}