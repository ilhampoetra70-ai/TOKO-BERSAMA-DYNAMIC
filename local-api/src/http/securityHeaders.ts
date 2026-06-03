import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config/index.js';

const allowedMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const allowedHeaders = 'authorization, content-type';
const localHostnames = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function normalizeOriginHeader(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function isOriginAllowed(origin: string) {
  if (config.corsAllowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && localHostnames.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function applySecurityHeaders(request: FastifyRequest, reply: FastifyReply) {
  const origin = normalizeOriginHeader(request.headers.origin);

  reply.header('x-tokobersama-request-id', String(request.id));
  reply.header('x-content-type-options', 'nosniff');
  reply.header('x-frame-options', 'SAMEORIGIN');
  reply.header('referrer-policy', 'no-referrer');
  reply.header('permissions-policy', 'camera=(self), microphone=(), geolocation=()');
  reply.header('Access-Control-Allow-Methods', allowedMethods);
  reply.header('Access-Control-Allow-Headers', allowedHeaders);
  reply.header('Access-Control-Expose-Headers', 'x-tokobersama-request-id');
  reply.header('Vary', 'Origin');

  if (origin && isOriginAllowed(origin)) {
    reply.header('Access-Control-Allow-Origin', origin);
  }

  return { origin, allowed: !origin || isOriginAllowed(origin) };
}
