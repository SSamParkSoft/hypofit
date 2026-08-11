export interface FieldError {
  field: string;
  message: string;
  code: string;
}

export interface ErrorDetail {
  code: string;
  message: string;
  status: number;
  request_id: string;
  debug_message?: string | null;
  field_errors?: FieldError[] | null;
}

export interface ErrorResponse {
  error: ErrorDetail;
}
