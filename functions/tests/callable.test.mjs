import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateEodSummary, getEodAiProviders } from '../lib/src/index.js'

test('compiled Firebase callables are deployable exports and reject unauthenticated requests', async () => {
  for (const callable of [generateEodSummary, getEodAiProviders]) {
    assert.equal(typeof callable, 'function')
    await assert.rejects(async () => callable.run({ data: {} }), { code: 'unauthenticated' })
  }
})
