import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateProjectConfig } from './config.mjs'
import { validateProtocolDocument } from './documents.mjs'
import { readJsonFile, validateJsonDocument } from './schema.mjs'
import { validateSkillsDirectory } from './skills.mjs'

export function evaluateHarness(harnessDirectory) {
  const results = validateSkillsDirectory(resolve(harnessDirectory, 'skills')).map((result) => ({
    subject: `skill:${result.name}`,
    errors: result.errors,
  }))

  const schemas = readSchemas(resolve(harnessDirectory, 'schemas'))
  for (const [name, schema] of schemas) {
    results.push({
      subject: `schema:${name}`,
      errors: schema.$schema && schema.$id ? [] : ['Schema must declare $schema and $id.'],
    })
  }

  results.push(
    validateProtocolFixture(
      'template:task',
      harnessDirectory,
      resolve(harnessDirectory, 'templates/task.json'),
      'task',
    ),
    validateProtocolFixture(
      'template:result',
      harnessDirectory,
      resolve(harnessDirectory, 'templates/result.json'),
      'result',
    ),
  )

  const examplesDirectory = resolve(harnessDirectory, 'evals/fixtures')
  if (existsSync(examplesDirectory)) {
    for (const entry of directoryEntries(examplesDirectory)) {
      const root = resolve(examplesDirectory, entry)
      const configPath = resolve(root, 'harness.project.json')
      try {
        const config = readJsonFile(configPath)
        const errors = validateJsonDocument(config, schemas.get('project.schema.json'))
        try {
          validateProjectConfig(config, configPath)
        } catch (error) {
          errors.push(error.message)
        }
        results.push({ subject: `fixture:${entry}:project`, errors })
      } catch (error) {
        results.push({ subject: `fixture:${entry}:project`, errors: [error.message] })
      }

      for (const kind of ['task', 'result']) {
        results.push(
          validateProtocolFixture(
            `fixture:${entry}:${kind}`,
            harnessDirectory,
            resolve(root, `example.${kind}.json`),
            kind,
          ),
        )
      }
    }
  }

  const scenariosDirectory = resolve(harnessDirectory, 'evals/scenarios')
  if (existsSync(scenariosDirectory)) {
    for (const filename of readdirSync(scenariosDirectory).filter((name) => name.endsWith('.json')).sort()) {
      results.push(
        validateFixture(
          `scenario:${filename}`,
          resolve(scenariosDirectory, filename),
          schemas.get('eval-scenario.schema.json'),
        ),
      )
    }
  }

  return results
}

function validateProtocolFixture(subject, harnessDirectory, path, kind) {
  try {
    return {
      subject,
      errors: validateProtocolDocument({ harnessDirectory, documentPath: path, kind }),
    }
  } catch (error) {
    return { subject, errors: [error.message] }
  }
}

function readSchemas(directory) {
  return new Map(
    readdirSync(directory)
      .filter((name) => name.endsWith('.schema.json'))
      .sort()
      .map((name) => [name, readJsonFile(resolve(directory, name))]),
  )
}

function validateFixture(subject, path, schema) {
  try {
    if (!schema) return { subject, errors: ['Required schema is missing.'] }
    return { subject, errors: validateJsonDocument(readJsonFile(path), schema) }
  } catch (error) {
    return { subject, errors: [error.message] }
  }
}

function directoryEntries(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}
