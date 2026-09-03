import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { validateSkill, validateSkillsDirectory } from '../src/skills.mjs'
import { syncSkills } from '../src/sync.mjs'

const harnessDirectory = fileURLToPath(new URL('../', import.meta.url))

test('all built-in skills have valid, discriminating metadata', () => {
  const results = validateSkillsDirectory(resolve(harnessDirectory, 'skills'))
  assert.equal(results.length, 5)
  assert.deepEqual(
    results.flatMap((result) => result.errors.map((error) => `${result.name}: ${error}`)),
    [],
  )
})

test('skill validation rejects a directory/name mismatch', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'harness-skill-'))
  try {
    writeFileSync(
      resolve(directory, 'SKILL.md'),
      '---\nname: another-name\ndescription: This description is long enough for reliable routing.\n---\n\nDo work.\n',
    )
    const result = validateSkill(directory)
    assert.ok(result.errors.some((error) => error.includes('must match directory name')))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('sync installs selected skills, is idempotent, and stops on conflicts', () => {
  const projectDirectory = mkdtempSync(resolve(tmpdir(), 'harness-sync-'))
  try {
    const config = {
      schemaVersion: 1,
      project: { name: 'sync-fixture' },
      knowledge: { entrypoint: null, documents: [] },
      commands: { verify: [] },
      skills: ['plan-change'],
      adapters: { skillDirectories: ['.agents/skills', '.claude/skills'] },
      policies: { approvalRequired: [] },
    }
    writeFileSync(resolve(projectDirectory, 'harness.project.json'), `${JSON.stringify(config)}\n`)

    const first = syncSkills({ harnessDirectory, projectDirectory })
    assert.deepEqual(first.map((result) => result.status), ['synced', 'synced'])

    const second = syncSkills({ harnessDirectory, projectDirectory })
    assert.deepEqual(second.map((result) => result.status), ['unchanged', 'unchanged'])

    writeFileSync(resolve(projectDirectory, '.agents/skills/plan-change/SKILL.md'), 'project override\n')
    const conflict = syncSkills({ harnessDirectory, projectDirectory })
    assert.equal(conflict[0].status, 'conflict')
    assert.equal(readFileSync(resolve(projectDirectory, '.agents/skills/plan-change/SKILL.md'), 'utf8'), 'project override\n')

    const forced = syncSkills({ harnessDirectory, projectDirectory, force: true })
    assert.equal(forced[0].status, 'synced')
    assert.match(
      readFileSync(resolve(projectDirectory, '.agents/skills/plan-change/SKILL.md'), 'utf8'),
      /name: plan-change/,
    )
  } finally {
    rmSync(projectDirectory, { recursive: true, force: true })
  }
})
