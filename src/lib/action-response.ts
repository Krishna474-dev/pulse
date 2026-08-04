export enum ErrorCode {
  VALIDATION_FAILED = "VALIDATION_FAILED",
  NOT_FOUND = "NOT_FOUND",
  DUPLICATE = "DUPLICATE",
  UNKNOWN = "UNKNOWN",
}

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string } };

export function ok<T>(data: T): ActionResponse<T> {
  return { success: true, data };
}

export function fail<T = never>(code: ErrorCode, message: string): ActionResponse<T> {
  return { success: false, error: { code, message } };
}
