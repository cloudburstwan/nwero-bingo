export default class Prompt {
  public id: string;
  public bucketId: string;
  public prompt: string;
  public description?: string;

  public constructor(id: string, bucketId: string, prompt: string, description?: string) {
    this.id = id;
    this.bucketId = bucketId;
    this.prompt = prompt;
    this.description = description;
  }
}