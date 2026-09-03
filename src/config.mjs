import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, isAbsolute, normalize, resolve } from 'node:path'

export const CONFIG_FILENAME = 'harness.project.json'

export function readProjectConfig(projectDirectory) {
  const path = resolve(projectDirectory, CONFIG_FILENAME)
  if (!existsSync(path)) {
    throw new Error(`Missing ${CONFIG_FILENAME} in ${projectDirectory}. Run \`harness init\` first.`)
  }

  let config
  try {
    config = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`Cannot parse ${path}: ${error.message}`)
  }

  validateProjectConfig(config, path)
  return config
}

export function validateProjectConfig(config, source = CONFIG_FILENAME) {
  if (config?.schemaVersion !== 1) {
    throw new Error(`${source}: schemaVersion must be 1.`)
  }
  if (!config.project?.name || typeof config.project.name !== 'string') {
    throw new Error(`${source}: project.name must be a non-empty string.`)
  }
  if (
    !Array.isArray(config.commands?.verify) ||
    config.commands.verify.some((command) => typeof command !== 'string' || !command.trim())
  ) {
    throw new Error(`${source}: commands.verify must be an array of non-empty command strings.`)
  }
  if (
    !Array.isArray(config.skills) ||
    config.skills.some((skill) => typeof skill !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill))
  ) {
    throw new Error(`${source}: skills must be an array of lowercase kebab-case skill names.`)
  }
  if (
    !Array.isArray(config.adapters?.skillDirectories) ||
    config.adapters.skillDirectories.some((directory) => !isSafeRelativeDirectory(directory))
  ) {
    throw new Error(`${source}: adapters.skillDirectories must contain safe project-relative directories.`)
  }
}

function isSafeRelativeDirectory(directory) {
  if (typeof directory !== 'string' || !directory.trim() || isAbsolute(directory)) return false
  const parts = normalize(directory).split(/[\\/]/)
  return !parts.includes('..') && normalize(directory) !== '.'
}

export function createProjectConfig(projectDirectory) {
  const path = resolve(projectDirectory, CONFIG_FILENAME)
  if (existsSync(path)) {
    throw new Error(`${path} already exists. Refusing to overwrite it.`)
  }

  const packageJsonPath = resolve(projectDirectory, 'package.json')
  let packageJson = {}
  if (existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    } catch {
      // Doctor reports malformed project files; init can still create a reviewable config.
    }
  }

  const verify = packageJson.scripts?.check
    ? [inferPackageCommand(projectDirectory, 'check')]
    : packageJson.scripts?.test
      ? [inferPackageCommand(projectDirectory, 'test')]
      : []

  const config = {
    schemaVersion: 1,
    project: { name: packageJson.name || basename(resolve(projectDirectory)) },
    knowledge: {
      entrypoint: existsSync(resolve(projectDirectory, 'AGENTS.md')) ? 'AGENTS.md' : null,
      documents: [],
    },
    commands: { verify },
    skills: [
      'plan-change',
      'diagnose-problem',
      'implement-change',
      'review-change',
      'verify-deliverable',
    ],
    adapters: {
      skillDirectories: ['.agents/skills', '.claude/skills', '.github/skills'],
    },
    policies: {
      approvalRequired: [
        'install-dependencies',
        'commit',
        'push',
        'deploy',
        'external-write',
      ],
    },
  }

  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { flag: 'wx' })
  return path
}

function inferPackageCommand(projectDirectory, script) {
  if (existsSync(resolve(projectDirectory, 'pnpm-lock.yaml'))) return `pnpm ${script}`
  if (existsSync(resolve(projectDirectory, 'yarn.lock'))) return `yarn ${script}`
  return `npm run ${script}`
}
