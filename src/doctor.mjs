import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { CONFIG_FILENAME, readProjectConfig } from './config.mjs'

const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb']

export function inspectProject(projectDirectory) {
  const checks = []
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10)
  checks.push({
    level: nodeMajor >= 18 ? 'pass' : 'error',
    message: `Node.js ${process.versions.node}${nodeMajor >= 18 ? '' : ' is unsupported; use Node.js 18 or newer'}`,
  })

  const lockfiles = LOCKFILES.filter((file) => existsSync(resolve(projectDirectory, file)))
  if (lockfiles.length > 1) {
    checks.push({
      level: 'warning',
      message: `Multiple package-manager lockfiles found: ${lockfiles.join(', ')}. Confirm the project standard and remove accidental lockfiles.`,
    })
  } else {
    checks.push({
      level: 'pass',
      message: lockfiles.length === 1 ? `Package manager lockfile: ${lockfiles[0]}` : 'No package-manager lockfile detected',
    })
  }

  const configPath = resolve(projectDirectory, CONFIG_FILENAME)
  if (!existsSync(configPath)) {
    checks.push({ level: 'warning', message: `${CONFIG_FILENAME} is missing; run \`harness init\`.` })
    return checks
  }

  try {
    const config = readProjectConfig(projectDirectory)
    checks.push({ level: 'pass', message: `${CONFIG_FILENAME} is valid (schema v${config.schemaVersion})` })
    if (config.knowledge?.entrypoint) {
      const entrypoint = resolve(projectDirectory, config.knowledge.entrypoint)
      checks.push({
        level: existsSync(entrypoint) ? 'pass' : 'error',
        message: existsSync(entrypoint)
          ? `Knowledge entrypoint found: ${config.knowledge.entrypoint}`
          : `Knowledge entrypoint is missing: ${config.knowledge.entrypoint}`,
      })
    } else {
      checks.push({ level: 'warning', message: 'No knowledge.entrypoint is configured.' })
    }
  } catch (error) {
    checks.push({ level: 'error', message: error.message })
  }

  return checks
}

export function printDoctorReport(checks, output = console.log) {
  const symbols = { pass: 'PASS', warning: 'WARN', error: 'FAIL' }
  for (const check of checks) output(`[${symbols[check.level]}] ${check.message}`)
}
