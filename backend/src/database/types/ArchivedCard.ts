export default class ArchivedCard {
  public id: string;
  public name: string;
  public date: Date;
  public archivedAt: Date;

  constructor(id: string, name: string, date: Date, archivedAt: Date) {
    this.id = id;
    this.name = name;
    this.date = date;
    this.archivedAt = archivedAt;
  }

  public getUrl() {
    return `/archived-cards/${this.id}.json`;
  }
}