import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readJsonFile, validateJsonDocument } from './schema.mjs'

export function validateProtocolDocument({ harnessDirectory, documentPath, kind }) {
  const schemaPath = resolve(harnessDirectory, 'schemas', `${kind}.schema.json`)
  const document = readJsonFile(documentPath)
  const schema = readJsonFile(schemaPath)
  const errors = validateJsonDocument(document, schema)
  if (errors.length === 0 && kind === 'result') errors.push(...validateResultSemantics(document))
  return errors
}

function validateResultSemantics(result) {
  const errors = []
  if (result.status === 'completed') {
    const incomplete = result.verification.filter((check) => check.status !== 'passed')
    if (incomplete.length > 0) {
      errors.push('A completed result cannot contain failed or not-run verification checks.')
    }
  }
  result.verification.forEach((check, index) => {
    if (check.status !== 'passed' && !check.evidence?.trim()) {
      errors.push(`$.verification[${index}].evidence must explain a ${check.status} check.`)
    }
  })
  return errors
}

export function createProtocolDocument({ harnessDirectory, destination, kind }) {
  if (existsSync(destination)) {
    throw new Error(`${destination} already exists. Refusing to overwrite it.`)
  }
  const template = resolve(harnessDirectory, 'templates', `${kind}.json`)
  writeFileSync(destination, readFileSync(template, 'utf8'), { flag: 'wx' })
  return destination
}
