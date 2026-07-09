import Session from "./Session";

export default class Sessions {
  private sessions: Session[] = [];

  public create(session: Session) {
    this.sessions.push(session);
  }

  public get(sessionId: string) {
    let index = this.sessions.findIndex(session => session.id === sessionId);
    if (index === -1) return null;

    if (this.sessions[index].expiresAt < new Date()) {
      this.sessions.splice(index, 1);
      return null;
    }

    return this.sessions[index];
  }

  public validate(sessionId: string | undefined) {
    if (sessionId === undefined) return false;
    if (!sessionId.startsWith("Bearer ")) return false;
    return this.get(sessionId.replace("Bearer ", "")) !== null;
  }
}