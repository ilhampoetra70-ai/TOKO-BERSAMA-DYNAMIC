import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '../core/errors.js';

function getRequestPath(request: FastifyRequest) {
  return request.url.split('?')[0] || request.url;
}

function getDiagnostic(request: FastifyRequest) {
  return {
    requestId: String(request.id),
    method: request.method,
    path: getRequestPath(request),
    timestamp: new Date().toISOString(),
  };
}

function mapZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    code: issue.code,
    message: issue.message,
  }));
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const diagnostic = getDiagnostic(request);
  reply.header('x-tokobersama-request-id', diagnostic.requestId);

  if (error instanceof DomainError) {
    request.log.warn({ err: error, diagnostic }, 'Domain API error');
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        ...diagnostic,
      },
    });
  }

  if (error instanceof ZodError) {
    request.log.warn({ err: error, diagnostic, validation: mapZodIssues(error) }, 'Request validation error');
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Format request tidak valid.',
        details: mapZodIssues(error),
        ...diagnostic,
      },
    });
  }

  if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
    request.log.warn({ err: error, diagnostic }, 'HTTP client API error');
    return reply.status(error.statusCode).send({
      error: {
        code: error.code || 'HTTP_CLIENT_ERROR',
        message: error.message || 'Request tidak valid.',
        ...diagnostic,
      },
    });
  }

  request.log.error({ err: error, diagnostic }, 'Unhandled API error');

  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: `Terjadi kesalahan internal. Kode diagnosis: ${diagnostic.requestId}.`,
      ...diagnostic,
    },
  });
}
