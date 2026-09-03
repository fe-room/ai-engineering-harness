import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'
import { runCli } from '../src/cli.mjs'

test('help returns success and lists core commands', async () => {
  const messages = []
  const status = await runCli(['help'], (message) => messages.push(message))
  assert.equal(status, 0)
  assert.match(messages.join('\n'), /harness doctor/)
  assert.match(messages.join('\n'), /harness eval/)
})

test('doctor warns but succeeds for an uninitialized directory', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'harness-cli-'))
  const messages = []
  try {
    const status = await runCli(['doctor', '--project', directory], (message) => messages.push(message))
    assert.equal(status, 0)
    assert.ok(messages.some((message) => message.includes('[WARN]')))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('unknown commands return a failure status', async () => {
  const errors = []
  const status = await runCli(['does-not-exist'], () => {}, (message) => errors.push(message))
  assert.equal(status, 1)
  assert.match(errors.join('\n'), /Unknown command/)
})
