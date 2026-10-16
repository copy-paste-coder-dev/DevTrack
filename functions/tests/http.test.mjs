import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { request as httpRequest } from 'node:http'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createEodHttpServer, createCooldown } from '../lib/src/httpApp.js'
import { renderConfiguration } from '../lib/src/renderConfig.js'
import { EodAiError } from '../lib/src/eodAi.js'
import { createEodAiTransport } from '../../src/features/eod/services/eodAi.transport.ts'

const origin = 'https://dev-track-46323.web.app'
const input = {
  date: '2026-10-16',
  totalLogged: '1h',
  target: '8h',
  remaining: '7h',
  overtime: '0m',
  sessionCount: 1,
  gaps: { count: 0, totalDuration: '0m' },
  tasks: [
    {
      taskName: 'Synthetic task',
      activityType: 'jira_task',
      status: 'completed',
      totalDuration: '1h',
      sessionCount: 1,
    },
  ],
}
async function start(t, overrides = {}) {
  const calls = []
  const provider = {
    generateSummary: async (facts) => {
      calls.push(facts)
      return { summary: 'Synthetic summary' }
    },
  }
  const server = createEodHttpServer({
    origins: [origin],
    providers: { groq: provider, gemini: provider },
    verifyToken: async (token) => {
      if (token !== 'valid-test-token') throw new Error('private token detail')
      return 'test-user'
    },
    ...overrides,
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve)
        server.closeAllConnections()
      }),
  )
  const base = `http://127.0.0.1:${server.address().port}`
  const headers = {
    Origin: origin,
    Authorization: 'Bearer valid-test-token',
    'Content-Type': 'application/json',
  }
  return {
    base,
    headers,
    calls,
    post: (data, more = {}) =>
      fetch(`${base}/summary`, { method: 'POST', headers, body: JSON.stringify(data), ...more }),
  }
}
test('health is public; discovery requires a verified Firebase identity, returns CORS and no-store', async (t) => {
  const { base, headers } = await start(t)
  assert.deepEqual(await (await fetch(`${base}/health`)).json(), { status: 'ok' })
  for (const authorization of ['', 'Bearer invalid', 'Basic secret']) {
    const response = await fetch(`${base}/providers`, { headers: { Authorization: authorization } })
    assert.equal(response.status, 401)
    assert.doesNotMatch(await response.text(), /private token detail|secret/)
  }
  const response = await fetch(`${base}/providers`, { headers })
  assert.equal(response.headers.get('access-control-allow-origin'), origin)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { providers: ['groq', 'gemini'] })
})
test('CORS permits only exact origins, methods and headers; routes reject unknown methods', async (t) => {
  const { base, headers } = await start(t)
  assert.equal(
    (
      await fetch(`${base}/providers`, {
        headers: { ...headers, Origin: `${origin}.evil.example` },
      })
    ).status,
    403,
  )
  const preflight = {
    Origin: origin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,content-type',
  }
  assert.equal(
    (await fetch(`${base}/summary`, { method: 'OPTIONS', headers: preflight })).status,
    204,
  )
  assert.equal(
    (
      await fetch(`${base}/summary`, {
        method: 'OPTIONS',
        headers: { ...preflight, 'Access-Control-Request-Headers': 'x-unsafe' },
      })
    ).status,
    403,
  )
  assert.equal((await fetch(`${base}/summary`, { method: 'GET', headers })).status, 405)
  assert.equal((await fetch(`${base}/unknown`)).status, 404)
})
test('authenticated summary dispatches both providers; same UID has a 30 second cooldown', async (t) => {
  const { post, calls } = await start(t)
  assert.equal((await post({ provider: 'gemini', input })).status, 200)
  const limited = await post({ provider: 'groq', input })
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('retry-after'), '30')
  assert.deepEqual(calls, [input])
  let now = 0
  const claim = createCooldown(() => now)
  assert.equal(claim('a'), true)
  assert.equal(claim('a'), false)
  assert.equal(claim('b'), true)
  now = 30000
  assert.equal(claim('a'), true)
})
test('rejects malformed, oversized and unsupported requests before provider calls, including streamed bodies', async (t) => {
  const { base, headers, post, calls } = await start(t)
  assert.equal((await post({ provider: 'groq', input, unexpected: true })).status, 400)
  assert.equal((await post({ provider: 'groq', input: { ...input, tasks: [] } })).status, 400)
  assert.equal((await post({}, { body: '{' })).status, 400)
  assert.equal(
    (await post({}, { headers: { ...headers, 'Content-Type': 'text/plain' } })).status,
    415,
  )
  assert.equal((await post({}, { body: 'a'.repeat(96001) })).status, 413)
  const streamedStatus = await new Promise((resolve, reject) => {
    const request = httpRequest(
      `${base}/summary`,
      { method: 'POST', headers: { ...headers, 'Transfer-Encoding': 'chunked' } },
      (response) => {
        response.resume()
        response.on('end', () => resolve(response.statusCode))
      },
    )
    request.on('error', reject)
    request.write('a'.repeat(48000))
    request.write('a'.repeat(48001))
    request.end()
  })
  assert.equal(streamedStatus, 413)
  assert.equal(calls.length, 0)
})
test('upstream failures are sanitized and missing providers stay unavailable', async (t) => {
  const { post } = await start(t, {
    providers: {
      groq: {
        generateSummary: async () => {
          throw new EodAiError('unavailable')
        },
      },
    },
  })
  assert.equal((await post({ provider: 'gemini', input })).status, 503)
  const response = await post({ provider: 'groq', input })
  assert.equal(response.status, 503)
  assert.deepEqual((await response.json()).error, {
    code: 'unavailable',
    message: 'AI enhancement is unavailable. Your standard EOD summary is still ready.',
  })
})
test('limits concurrent generations even for different authenticated users', async (t) => {
  let release
  let entered = 0
  const gate = new Promise((resolve) => {
    release = resolve
  })
  const { base, headers } = await start(t, {
    verifyToken: async (token) => token,
    providers: {
      groq: {
        generateSummary: async () => {
          entered++
          await gate
          return { summary: 'ready' }
        },
      },
    },
  })
  const send = (uid) =>
    fetch(`${base}/summary`, {
      method: 'POST',
      headers: { ...headers, Authorization: `Bearer ${uid}` },
      body: JSON.stringify({ provider: 'groq', input }),
    })
  const first = send('first'),
    second = send('second')
  try {
    for (let i = 0; entered < 2 && i < 100; i++)
      await new Promise((resolve) => setTimeout(resolve, 10))
    assert.equal(entered, 2)
    assert.equal((await send('third')).status, 429)
  } finally {
    release()
    await Promise.all([first, second])
  }
})
test('configuration fails closed on missing keys, bad origins and emulator tokens', () => {
  const env = {
    FIREBASE_PROJECT_ID: 'dev-track-46323',
    ALLOWED_ORIGINS: origin,
    NODE_ENV: 'production',
  }
  assert.deepEqual(Object.keys(renderConfiguration(env).providers), [])
  for (const change of [
    { EOD_AI_PROVIDERS: 'groq' },
    { EOD_AI_KEYS: 'not-json' },
    { EOD_AI_KEYS: 'null' },
    { ALLOWED_ORIGINS: '*' },
    { ALLOWED_ORIGINS: `${origin}/path` },
    { ALLOWED_ORIGINS: 'http://localhost:5173' },
    { FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' },
    { PORT: 'NaN' },
  ])
    assert.throws(() => renderConfiguration({ ...env, ...change }))
  assert.doesNotThrow(() =>
    renderConfiguration({
      ...env,
      EOD_AI_PROVIDERS: 'groq,gemini',
      EOD_AI_KEYS: '{"groq":"test","gemini":"test"}',
      GROQ_MODEL: 'model',
      GEMINI_MODEL: 'model',
    }),
  )
})
test('real Admin verifier rejects unsigned fabricated tokens without service-account credentials', async (t) => {
  const app = initializeApp({ projectId: 'dev-track-46323' }, `http-test-${Date.now()}`)
  t.after(() => deleteApp(app))
  const { base } = await start(t, {
    verifyToken: async (token) => (await getAuth(app).verifyIdToken(token)).uid,
  })
  const encoded = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const forged = `${encoded({ alg: 'none', typ: 'JWT' })}.${encoded({ sub: 'fake', aud: 'dev-track-46323', iss: 'https://securetoken.google.com/dev-track-46323', exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })}.`
  assert.equal(
    (await fetch(`${base}/providers`, { headers: { Authorization: `Bearer ${forged}` } })).status,
    401,
  )
})

test('browser transport interoperates with the HTTP routes, including error fallback', async (t) => {
  const { base, calls } = await start(t)
  const service = createEodAiTransport({
    baseUrl: base,
    allowLocalHttp: true,
    getToken: async () => 'valid-test-token',
  })
  assert.deepEqual(await service.getProviders(), ['groq', 'gemini'])
  assert.deepEqual(await service.generate('groq', input), { summary: 'Synthetic summary' })
  assert.deepEqual(calls, [input])
  await assert.rejects(() => service.generate('gemini', input), /unavailable/)
})
