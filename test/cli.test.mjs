import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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

test('CLI creates and validates a task relative to the target project', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'harness-cli-'))
  const messages = []
  try {
    const createStatus = await runCli(
      ['create-task', 'task.json', '--project', directory],
      (message) => messages.push(message),
    )
    const validateStatus = await runCli(
      ['validate-task', 'task.json', '--project', directory],
      (message) => messages.push(message),
    )
    assert.equal(createStatus, 0)
    assert.equal(validateStatus, 0)
    assert.equal(existsSync(resolve(directory, 'task.json')), true)
    assert.ok(messages.some((message) => message.includes('[PASS] task:task.json')))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('CLI returns failure for an invalid result document', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'harness-cli-'))
  const errors = []
  try {
    writeFileSync(resolve(directory, 'result.json'), '{"schemaVersion":1,"status":"completed"}\n')
    const status = await runCli(
      ['validate-result', 'result.json', '--project', directory],
      (message) => errors.push(message),
    )
    assert.equal(status, 1)
    assert.ok(errors.some((message) => message.includes('summary is required')))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
