export enum ErrorCode {
  VALIDATION_FAILED = "VALIDATION_FAILED",
  NOT_FOUND = "NOT_FOUND",
  DUPLICATE = "DUPLICATE",
  UNKNOWN = "UNKNOWN",
}

export type ActionResponse<T> =
  | { success: true; data: T }
  | {
      success: false;
      /** `fields` carries per-input messages so a form can flag every problem at once. */
      error: { code: ErrorCode; message: string; fields?: Record<string, string> };
    };

export function ok<T>(data: T): ActionResponse<T> {
  return { success: true, data };
}

export function fail<T = never>(
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>,
): ActionResponse<T> {
  return { success: false, error: { code, message, fields } };
}
