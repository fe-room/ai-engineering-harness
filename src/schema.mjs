import { readFileSync } from 'node:fs'

export function readJsonFile(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`Cannot parse ${path}: ${error.message}`)
  }
}

export function validateJsonDocument(document, schema) {
  const errors = []
  validateValue(document, schema, '$', errors)
  return errors
}

function validateValue(value, schema, path, errors) {
  if ('const' in schema && !isEqual(value, schema.const)) {
    errors.push(`${path} must equal ${JSON.stringify(schema.const)}.`)
    return
  }
  if (schema.enum && !schema.enum.some((candidate) => isEqual(value, candidate))) {
    errors.push(`${path} must be one of: ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}.`)
    return
  }
  if (schema.type && !matchesAnyType(value, schema.type)) {
    const label = Array.isArray(schema.type) ? schema.type.join(' or ') : schema.type
    errors.push(`${path} must be ${article(label)} ${label}.`)
    return
  }

  if (isSchemaType(schema, 'string') && typeof value === 'string' && schema.minLength && value.length < schema.minLength) {
    errors.push(`${path} must contain at least ${schema.minLength} character(s).`)
  }

  if (typeof value === 'string' && schema.pattern && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${path} must match ${schema.pattern}.`)
  }

  if (isSchemaType(schema, 'array') && Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) {
      errors.push(`${path} must contain at least ${schema.minItems} item(s).`)
    }
    if (schema.items) {
      value.forEach((item, index) => validateValue(item, schema.items, `${path}[${index}]`, errors))
    }
  }

  if (isSchemaType(schema, 'object') && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${path}.${key} is required.`)
    }
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties?.[key]) {
        validateValue(child, schema.properties[key], `${path}.${key}`, errors)
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}.${key} is not allowed.`)
      }
    }
  }
}

function matchesAnyType(value, type) {
  return (Array.isArray(type) ? type : [type]).some((candidate) => matchesType(value, candidate))
}

function isSchemaType(schema, type) {
  return (Array.isArray(schema.type) ? schema.type : [schema.type]).includes(type)
}

function matchesType(value, type) {
  if (type === 'array') return Array.isArray(value)
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value)
  if (type === 'integer') return Number.isInteger(value)
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (type === 'null') return value === null
  return typeof value === type
}

function isEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function article(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a'
}
