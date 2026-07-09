export default interface History {
  id: string;
  userId: string;
  table: string;
  action: HistoryAction;
  primaryKey: string;
  data: any;
  createdAt: Date;
}

export enum HistoryAction {
  NONE,
  CREATE,
  UPDATE,
  DELETE,
  ARCHIVE
}