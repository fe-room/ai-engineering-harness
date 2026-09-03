import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'
import { verifyProject } from '../src/verify.mjs'

function createFixture(verifyCommands) {
  const directory = mkdtempSync(resolve(tmpdir(), 'harness-verify-'))
  const config = {
    schemaVersion: 1,
    project: { name: 'verify-fixture' },
    commands: { verify: verifyCommands },
    skills: [],
    adapters: { skillDirectories: [] },
  }
  writeFileSync(resolve(directory, 'harness.project.json'), `${JSON.stringify(config)}\n`)
  return directory
}

test('verify returns success only when every configured command passes', () => {
  const directory = createFixture(['node -e "process.exit(0)"', 'node -e "process.exit(0)"'])
  const messages = []
  try {
    assert.equal(verifyProject(directory, (message) => messages.push(message)), 0)
    assert.match(messages.at(-1), /All configured verification commands passed/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('verify stops and returns failure when a command fails', () => {
  const directory = createFixture(['node -e "process.exit(7)"', 'node -e "process.exit(0)"'])
  const messages = []
  try {
    assert.equal(verifyProject(directory, (message) => messages.push(message)), 7)
    assert.equal(messages.filter((message) => message.startsWith('[RUN]')).length, 1)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('verify reports an unconfigured gate instead of claiming success', () => {
  const directory = createFixture([])
  const messages = []
  try {
    assert.equal(verifyProject(directory, (message) => messages.push(message)), 2)
    assert.match(messages[0], /No verification commands/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
