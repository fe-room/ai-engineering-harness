import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createProjectConfig, readProjectConfig, validateProjectConfig } from '../src/config.mjs'
import { inspectProject } from '../src/doctor.mjs'

const harnessDirectory = fileURLToPath(new URL('../', import.meta.url))

test('init creates a reviewable project config and infers pnpm check', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'harness-config-'))
  try {
    writeFileSync(
      resolve(directory, 'package.json'),
      JSON.stringify({ name: 'example-project', scripts: { check: 'test-command' } }),
    )
    writeFileSync(resolve(directory, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    writeFileSync(resolve(directory, 'AGENTS.md'), '# Instructions\n')

    const path = createProjectConfig(directory)
    const config = readProjectConfig(directory)

    assert.equal(path, resolve(directory, 'harness.project.json'))
    assert.equal(config.project.name, 'example-project')
    assert.deepEqual(config.commands.verify, ['pnpm check'])
    assert.equal(config.knowledge.entrypoint, 'AGENTS.md')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('init refuses to overwrite an existing project config', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'harness-config-'))
  try {
    writeFileSync(resolve(directory, 'harness.project.json'), '{}')
    assert.throws(() => createProjectConfig(directory), /Refusing to overwrite/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('doctor reports conflicting package-manager lockfiles', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'harness-doctor-'))
  try {
    writeFileSync(resolve(directory, 'pnpm-lock.yaml'), '')
    writeFileSync(resolve(directory, 'package-lock.json'), '{}')

    const checks = inspectProject(directory)

    assert.ok(checks.some((check) => check.level === 'warning' && check.message.includes('Multiple')))
    assert.ok(checks.some((check) => check.message.includes('harness.project.json is missing')))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('doctor reports missing knowledge and unsynchronized skills', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'harness-doctor-'))
  try {
    const config = {
      schemaVersion: 1,
      project: { name: 'doctor-fixture' },
      knowledge: { entrypoint: 'AGENTS.md', documents: ['docs/missing.md'] },
      commands: { verify: ['npm test'] },
      skills: ['plan-change'],
      adapters: { skillDirectories: ['.agents/skills'] },
      policies: { approvalRequired: [] },
    }
    writeFileSync(resolve(directory, 'harness.project.json'), JSON.stringify(config))
    const checks = inspectProject(directory, { harnessDirectory })
    assert.ok(checks.some((check) => check.level === 'error' && check.message.includes('AGENTS.md')))
    assert.ok(checks.some((check) => check.level === 'error' && check.message.includes('docs/missing.md')))
    assert.ok(checks.some((check) => check.level === 'warning' && check.message.includes('harness sync')))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('schemas contain valid JSON and stable version identifiers', () => {
  for (const filename of ['task.schema.json', 'result.schema.json']) {
    const schema = JSON.parse(readFileSync(resolve(harnessDirectory, 'schemas', filename), 'utf8'))
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema')
    assert.match(schema.$id, /\/v1$/)
  }
})

test('project config rejects skill output paths outside the project', () => {
  assert.throws(
    () =>
      validateProjectConfig({
        schemaVersion: 1,
        project: { name: 'unsafe' },
        knowledge: { entrypoint: null, documents: [] },
        commands: { verify: [] },
        skills: ['plan-change'],
        adapters: { skillDirectories: ['../outside'] },
        policies: { approvalRequired: [] },
      }),
    /safe project-relative directories/,
  )
})

test('project config rejects knowledge paths outside the project', () => {
  assert.throws(
    () =>
      validateProjectConfig({
        schemaVersion: 1,
        project: { name: 'unsafe' },
        knowledge: { entrypoint: '../../AGENTS.md', documents: [] },
        commands: { verify: [] },
        skills: [],
        adapters: { skillDirectories: [] },
        policies: { approvalRequired: [] },
      }),
    /knowledge.entrypoint/,
  )
})
