export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'unauthorized', message);
  }
}

// Single error for every login-code failure mode (wrong code, expired,
// consumed, attempt cap hit, unknown email). Keeping the surface uniform
// is what prevents enumeration and oracle attacks against the verify flow.
export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid code') {
    super(400, 'invalid_code', message);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, 'internal_error', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'not_found', message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, 'bad_request', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, 'conflict', message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload too large') {
    super(413, 'payload_too_large', message);
  }
}
