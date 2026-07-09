export default class APIError extends Error {
  public httpCode: number;
  public code: string;
  public message: string;
  public explanations: any[];

  constructor(httpCode: number, code: string, message: string) {
    super(`${code} (http: ${httpCode}): ${message}`);
    this.httpCode = httpCode;
    this.code = code;
    this.message = message;
    this.explanations = [];
  }

  public addExplanation(explanation: any) {
    this.explanations.push(explanation);
  }
}