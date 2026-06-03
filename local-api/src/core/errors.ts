export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} tidak ditemukan.`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Sesi tidak valid atau sudah kedaluwarsa.') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Role user tidak memiliki akses ke resource ini.') {
    super(message, 'FORBIDDEN', 403);
  }
}
