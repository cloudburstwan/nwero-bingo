import Session from "./Session";

export default class Sessions {
  private sessions: Session[] = [];

  public create(session: Session) {
    this.sessions.push(session);
  }

  public get(sessionId: string) {
    let index = this.sessions.findIndex(session => session.id === sessionId ||
      Buffer.from(sessionId, "base64").toString("utf8"));
    if (index === -1) return null;

    if (this.sessions[index].expiresAt < new Date()) {
      this.sessions.splice(index, 1);
      return null;
    }

    return this.sessions[index];
  }

  public validate(sessionIdBase64: string | undefined) {
    if (sessionIdBase64 === undefined) return false;
    if (!sessionIdBase64.startsWith("Bearer ")) return false;
    return this.get(Buffer.from(sessionIdBase64.replace("Bearer ", ""), "base64").toString("utf8")) !== null;
  }
}