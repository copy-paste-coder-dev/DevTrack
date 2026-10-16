import assert from 'node:assert/strict'
import { test } from 'node:test'

// This suite deliberately cannot target a public deployment.
const origin = 'http://127.0.0.1:5005'

test('Hosting serves the production SPA for every direct entry/reload path with security headers', async () => {
  const index = await (await fetch(origin)).text()
  assert.match(index, /<title>DevTrack/)
  assert.doesNotMatch(index, /\/src\/main\.tsx|devtrack-e2e-/)
  for (const path of [
    '/',
    '/login',
    '/app',
    '/app/calendar',
    '/app/eod',
    '/app/settings',
    '/not-a-route',
  ]) {
    const response = await fetch(`${origin}${path}`)
    assert.equal(response.status, 200, path)
    assert.equal(await response.text(), index, path)
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
    assert.equal(
      response.headers.get('permissions-policy'),
      'camera=(), microphone=(), geolocation=()',
    )
    assert.equal(response.headers.get('cache-control'), 'no-cache')
  }
  const hidden = await fetch(`${origin}/.env`)
  assert.equal(hidden.status, 404, 'Hidden environment files must not be served or rewritten')
  assert.doesNotMatch(await hidden.text(), /VITE_FIREBASE_|BEGIN PRIVATE KEY/)
})

test('hashed JS/CSS load with immutable caching while the favicon remains available', async () => {
  const index = await (await fetch(origin)).text()
  const assets = [...index.matchAll(/(?:src|href)="(\/assets\/.*?)"/g)].map((match) => match[1])
  assert.ok(assets.some((asset) => asset.endsWith('.js')))
  assert.ok(assets.some((asset) => asset.endsWith('.css')))
  for (const path of assets) {
    const response = await fetch(`${origin}${path}`)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable')
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  }
  assert.equal((await fetch(`${origin}/favicon.svg`)).status, 200)
})
