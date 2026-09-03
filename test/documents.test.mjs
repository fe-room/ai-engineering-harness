import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createProtocolDocument, validateProtocolDocument } from '../src/documents.mjs'
import { evaluateHarness } from '../src/eval.mjs'

const harnessDirectory = fileURLToPath(new URL('../', import.meta.url))

test('task and result templates pass runtime protocol validation', () => {
  for (const kind of ['task', 'result']) {
    const errors = validateProtocolDocument({
      harnessDirectory,
      documentPath: resolve(harnessDirectory, 'templates', `${kind}.json`),
      kind,
    })
    assert.deepEqual(errors, [])
  }
})

test('runtime validation reports missing, unknown, and invalid task fields', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'harness-document-'))
  try {
    const path = resolve(directory, 'invalid-task.json')
    writeFileSync(path, JSON.stringify({ schemaVersion: 1, objective: '', unexpected: true }))
    const errors = validateProtocolDocument({ harnessDirectory, documentPath: path, kind: 'task' })
    assert.ok(errors.some((error) => error.includes('acceptanceCriteria is required')))
    assert.ok(errors.some((error) => error.includes('objective must contain')))
    assert.ok(errors.some((error) => error.includes('unexpected is not allowed')))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('a completed result cannot hide an unexecuted check', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'harness-document-'))
  try {
    const path = resolve(directory, 'invalid-result.json')
    const result = JSON.parse(readFileSync(resolve(harnessDirectory, 'templates/result.json'), 'utf8'))
    result.status = 'completed'
    writeFileSync(path, JSON.stringify(result))
    const errors = validateProtocolDocument({ harnessDirectory, documentPath: path, kind: 'result' })
    assert.ok(errors.some((error) => error.includes('completed result cannot contain')))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('document creation copies a template and refuses to overwrite it', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'harness-document-'))
  const destination = resolve(directory, 'task.json')
  try {
    createProtocolDocument({ harnessDirectory, destination, kind: 'task' })
    assert.deepEqual(
      JSON.parse(readFileSync(destination, 'utf8')),
      JSON.parse(readFileSync(resolve(harnessDirectory, 'templates/task.json'), 'utf8')),
    )
    assert.throws(
      () => createProtocolDocument({ harnessDirectory, destination, kind: 'task' }),
      /Refusing to overwrite/,
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('the static evaluation catalog is internally consistent', () => {
  const errors = evaluateHarness(harnessDirectory).flatMap((result) => result.errors)
  assert.deepEqual(errors, [])
})
