import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createEodAiTransport } from '../src/features/eod/services/eodAi.transport.ts'

test('HTTP transport uses a fresh Firebase token, omits cookies and sends only provider/input', async () => {
  const calls = []
  let tokens = 0
  const service = createEodAiTransport({
    baseUrl: 'https://backend.example',
    getToken: async () => `token-${++tokens}`,
    request: async (url, options) => {
      calls.push({ url: String(url), ...options })
      return new Response(
        JSON.stringify(
          calls.length === 1 ? { providers: ['groq', 'gemini'] } : { summary: 'ready' },
        ),
      )
    },
  })
  assert.deepEqual(await service.getProviders(), ['groq', 'gemini'])
  assert.deepEqual(await service.generate('gemini', { synthetic: true }), { summary: 'ready' })
  assert.equal(calls[0].url, 'https://backend.example/providers')
  assert.equal(calls[1].url, 'https://backend.example/summary')
  assert.equal(calls[1].headers.Authorization, 'Bearer token-2')
  assert.equal(calls[1].credentials, 'omit')
  assert.equal(calls[1].redirect, 'error')
  assert.ok(calls[1].signal)
  assert.deepEqual(JSON.parse(calls[1].body), { provider: 'gemini', input: { synthetic: true } })
})
test('missing config/auth and unsafe URLs make no network request', async () => {
  for (const baseUrl of [
    '',
    'http://remote.example',
    'https://user:pass@backend.example',
    'https://backend.example/path',
    'https://backend.example?key=x',
  ]) {
    const service = createEodAiTransport({
      baseUrl,
      getToken: async () => 'test',
      request: async () => {
        assert.fail('network must not run')
      },
    })
    await assert.rejects(() => service.getProviders())
  }
  await assert.rejects(() =>
    createEodAiTransport({
      baseUrl: 'http://localhost:10000',
      getToken: async () => '',
      request: async () => {
        assert.fail('network must not run')
      },
    }).getProviders(),
  )
})

test('loopback HTTP is available only when explicitly enabled for development', async () => {
  const options = {
    baseUrl: 'http://127.0.0.1:10000',
    getToken: async () => 'test',
    request: async () => new Response('{"providers":["groq"]}'),
  }
  await assert.rejects(() => createEodAiTransport(options).getProviders())
  assert.deepEqual(
    await createEodAiTransport({ ...options, allowLocalHttp: true }).getProviders(),
    ['groq'],
  )
})
test('malformed replies, HTTP errors and aborted requests reject for standard-summary fallback', async () => {
  for (const value of [null, {}, { providers: 'groq' }, { providers: ['unknown'] }]) {
    const service = createEodAiTransport({
      baseUrl: 'https://backend.example',
      getToken: async () => 'test',
      request: async () => new Response(JSON.stringify(value)),
    })
    await assert.rejects(() => service.getProviders())
  }
  for (const value of [
    null,
    {},
    { summary: '' },
    { summary: ' '.repeat(2) },
    { summary: 'x'.repeat(64001) },
  ]) {
    await assert.rejects(() =>
      createEodAiTransport({
        baseUrl: 'https://backend.example',
        getToken: async () => 'test',
        request: async () => new Response(JSON.stringify(value)),
      }).generate('groq', {}),
    )
  }
  for (const status of [401, 429, 503]) {
    await assert.rejects(
      () =>
        createEodAiTransport({
          baseUrl: 'https://backend.example',
          getToken: async () => 'test',
          request: async () => new Response('private detail', { status }),
        }).getProviders(),
      /unavailable/,
    )
  }
  await assert.rejects(
    () =>
      createEodAiTransport({
        baseUrl: 'https://backend.example',
        getToken: async () => 'test',
        request: async () => {
          throw new DOMException('Timed out', 'TimeoutError')
        },
      }).getProviders(),
    { name: 'TimeoutError' },
  )
})
