// Custom error types for structured error handling
export class ChatError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'ChatError'
  }
}

export class AuthenticationError extends ChatError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_REQUIRED', 401)
  }
}

export class AuthorizationError extends ChatError {
  constructor(message: string = 'Access denied') {
    super(message, 'ACCESS_DENIED', 403)
  }
}

export class ValidationError extends ChatError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
  }
}

export class NotFoundError extends ChatError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404)
  }
}

export class RateLimitError extends ChatError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429)
  }
}

export class ServerConfigurationError extends ChatError {
  constructor(message: string = 'Server configuration error') {
    super(message, 'SERVER_CONFIGURATION_ERROR', 500)
  }
}