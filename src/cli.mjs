import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createProjectConfig } from './config.mjs'
import { createProtocolDocument, validateProtocolDocument } from './documents.mjs'
import { inspectProject, printDoctorReport } from './doctor.mjs'
import { evaluateHarness } from './eval.mjs'
import { validateSkill } from './skills.mjs'
import { syncSkills } from './sync.mjs'
import { verifyProject } from './verify.mjs'

const HARNESS_DIRECTORY = fileURLToPath(new URL('../', import.meta.url))

export async function runCli(args, output = console.log, errorOutput = console.error) {
  const [command = 'help', ...rest] = args
  const projectDirectory = resolve(readOption(rest, '--project') || '.')

  try {
    switch (command) {
      case 'help':
      case '--help':
      case '-h':
        output(helpText())
        return 0
      case 'init': {
        const path = createProjectConfig(projectDirectory)
        output(`Created ${path}. Review the generated commands, knowledge sources, policies, and adapters.`)
        return 0
      }
      case 'doctor': {
        const checks = inspectProject(projectDirectory, { harnessDirectory: HARNESS_DIRECTORY })
        printDoctorReport(checks, output)
        return checks.some((check) => check.level === 'error') ? 1 : 0
      }
      case 'sync': {
        const results = syncSkills({
          harnessDirectory: HARNESS_DIRECTORY,
          projectDirectory,
          force: rest.includes('--force'),
        })
        for (const result of results) output(`[${result.status.toUpperCase()}] ${result.target}: ${result.message}`)
        return results.some((result) => ['error', 'conflict'].includes(result.status)) ? 1 : 0
      }
      case 'verify':
        return verifyProject(projectDirectory, output)
      case 'validate-skill': {
        const [skillDirectory] = positionalArguments(rest)
        if (!skillDirectory) throw new Error('Usage: harness validate-skill <skill-directory>')
        return printSkillResults([validateSkill(resolve(skillDirectory))], output)
      }
      case 'validate-task':
      case 'validate-result': {
        const kind = command === 'validate-task' ? 'task' : 'result'
        const [documentPath] = positionalArguments(rest)
        if (!documentPath) throw new Error(`Usage: harness ${command} <file>`)
        const errors = validateProtocolDocument({
          harnessDirectory: HARNESS_DIRECTORY,
          documentPath: resolve(projectDirectory, documentPath),
          kind,
        })
        return printValidationResult(`${kind}:${documentPath}`, errors, output)
      }
      case 'create-task':
      case 'create-result': {
        const kind = command === 'create-task' ? 'task' : 'result'
        const [destination] = positionalArguments(rest)
        if (!destination) throw new Error(`Usage: harness ${command} <file>`)
        const path = createProtocolDocument({
          harnessDirectory: HARNESS_DIRECTORY,
          destination: resolve(projectDirectory, destination),
          kind,
        })
        output(`Created ${path}. Replace the template guidance, then run \`harness validate-${kind} ${path}\`.`)
        return 0
      }
      case 'eval':
        return printEvaluationResults(evaluateHarness(HARNESS_DIRECTORY), output)
      default:
        errorOutput(`Unknown command: ${command}`)
        errorOutput(helpText())
        return 1
    }
  } catch (error) {
    errorOutput(`[FAIL] ${error.message}`)
    return 1
  }
}

function printValidationResult(subject, errors, output) {
  if (errors.length === 0) {
    output(`[PASS] ${subject}`)
    return 0
  }
  for (const error of errors) output(`[FAIL] ${subject}: ${error}`)
  return 1
}

function printEvaluationResults(results, output) {
  let failed = false
  for (const result of results) {
    if (result.errors.length === 0) output(`[PASS] ${result.subject}`)
    else {
      failed = true
      for (const error of result.errors) output(`[FAIL] ${result.subject}: ${error}`)
    }
  }
  return failed ? 1 : 0
}

function printSkillResults(results, output) {
  let failed = false
  for (const result of results) {
    if (result.errors.length === 0) {
      output(`[PASS] ${result.name}`)
    } else {
      failed = true
      for (const message of result.errors) output(`[FAIL] ${result.name}: ${message}`)
    }
  }
  return failed ? 1 : 0
}

function readOption(args, name) {
  const index = args.indexOf(name)
  if (index === -1) return null
  if (!args[index + 1]) throw new Error(`${name} requires a value.`)
  return args[index + 1]
}

function positionalArguments(args) {
  const values = []
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--project') {
      index += 1
      continue
    }
    if (!args[index].startsWith('--')) values.push(args[index])
  }
  return values
}

function helpText() {
  return `AI Engineering Harness

Usage:
  harness init [--project <directory>]
  harness doctor [--project <directory>]
  harness sync [--project <directory>] [--force]
  harness verify [--project <directory>]
  harness eval
  harness validate-skill <skill-directory>
  harness create-task <file>
  harness validate-task <file>
  harness create-result <file>
  harness validate-result <file>`
}
