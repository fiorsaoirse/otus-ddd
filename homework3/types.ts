export type ID = string;

export interface ILogger {
  log(message: unknown): void;
}