import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { EodAiError, generateEodForRequest, type EodAiProvider } from './eodAi.js'
import type { EodAiProviderId } from '../shared/eodAi.js'

const message = 'AI enhancement is unavailable. Your standard EOD summary is still ready.'
const maxBodyBytes = 96000
class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code)
  }
}
export function createCooldown(now = Date.now) {
  const cooldowns = new Map<string, number>()
  return (uid: string) => {
    const time = now()
    for (const [key, expires] of cooldowns) if (expires <= time) cooldowns.delete(key)
    if (cooldowns.has(uid) || cooldowns.size >= 10000) return false
    cooldowns.set(uid, time + 30000)
    return true
  }
}
async function readJson(request: IncomingMessage): Promise<unknown> {
  if (
    !/^application\/json(?:\s*;.*)?$/i.test(request.headers['content-type'] ?? '') ||
    request.headers['content-encoding']
  )
    throw new HttpError(415, 'invalid-argument')
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    const cleanup = () => {
      request.off('data', onData)
      request.off('end', onEnd)
      request.off('error', onError)
      request.off('aborted', onAborted)
    }
    const fail = (error: Error) => {
      cleanup()
      reject(error)
    }
    const onData = (buffer: Buffer) => {
      size += buffer.length
      if (size > maxBodyBytes) {
        fail(new HttpError(413, 'invalid-argument'))
        request.resume()
      } else chunks.push(buffer)
    }
    const onEnd = () => {
      cleanup()
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown)
      } catch {
        reject(new HttpError(400, 'invalid-argument'))
      }
    }
    const onError = () => fail(new HttpError(400, 'invalid-argument'))
    const onAborted = () => fail(new HttpError(400, 'invalid-argument'))
    request.on('data', onData).once('end', onEnd).once('error', onError).once('aborted', onAborted)
  })
}
function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}
export function createEodHttpServer(dependencies: {
  origins: readonly string[]
  verifyToken: (token: string) => Promise<string>
  providers: Partial<Record<EodAiProviderId, EodAiProvider>>
  claim?: (uid: string) => boolean
}) {
  const claim = dependencies.claim ?? createCooldown()
  let inFlight = 0
  const server = createServer((request, response) => {
    void (async () => {
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('X-Content-Type-Options', 'nosniff')
      response.setHeader('Vary', 'Origin')
      const origin = request.headers.origin
      if (origin) {
        if (!dependencies.origins.includes(origin)) throw new HttpError(403, 'permission-denied')
        response.setHeader('Access-Control-Allow-Origin', origin)
      }
      const path = new URL(request.url ?? '/', 'http://localhost').pathname
      if (path === '/health' && request.method === 'GET') {
        json(response, 200, { status: 'ok' })
        return
      }
      if (path !== '/providers' && path !== '/summary') throw new HttpError(404, 'not-found')
      const method = path === '/providers' ? 'GET' : 'POST'
      if (request.method === 'OPTIONS') {
        const headers = (request.headers['access-control-request-headers'] ?? '')
          .toLowerCase()
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
        if (
          !origin ||
          request.headers['access-control-request-method'] !== method ||
          headers.some((header) => !['authorization', 'content-type'].includes(header))
        )
          throw new HttpError(403, 'permission-denied')
        response.writeHead(204, {
          'Access-Control-Allow-Methods': method,
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Max-Age': '600',
        })
        response.end()
        return
      }
      if (request.method !== method) {
        response.setHeader('Allow', `${method}, OPTIONS`)
        throw new HttpError(405, 'invalid-argument')
      }
      const authorization = request.headers.authorization ?? ''
      if (authorization.length > 8192 || !/^Bearer [^\s]+$/.test(authorization))
        throw new HttpError(401, 'unauthenticated')
      let uid: string
      try {
        uid = await dependencies.verifyToken(authorization.slice(7))
        if (!uid) throw new Error('Missing identity')
      } catch {
        throw new HttpError(401, 'unauthenticated')
      }
      if (path === '/providers') {
        json(response, 200, { providers: Object.keys(dependencies.providers) })
        return
      }
      if (Number(request.headers['content-length']) > maxBodyBytes)
        throw new HttpError(413, 'invalid-argument')
      const data = await readJson(request)
      if (inFlight >= 2) throw new HttpError(429, 'resource-exhausted')
      inFlight++
      try {
        const result = await generateEodForRequest(
          { uid, data },
          { providers: dependencies.providers, claim },
        )
        json(response, 200, result)
      } finally {
        inFlight--
      }
    })().catch((error: unknown) => {
      const status =
        error instanceof HttpError
          ? error.status
          : error instanceof EodAiError
            ? {
                unauthenticated: 401,
                'invalid-argument': 400,
                'failed-precondition': 503,
                'resource-exhausted': 429,
                unavailable: 503,
              }[error.code]
            : 503
      if (status === 429) response.setHeader('Retry-After', '30')
      if (!response.destroyed)
        json(response, status, {
          error: {
            code:
              error instanceof HttpError || error instanceof EodAiError
                ? error.code
                : 'unavailable',
            message,
          },
        })
      request.resume()
    })
  })
  server.headersTimeout = 10000
  server.requestTimeout = 15000
  server.keepAliveTimeout = 5000
  return server
}
