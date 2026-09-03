import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { readProjectConfig } from './config.mjs'

export function syncSkills({ harnessDirectory, projectDirectory, force = false }) {
  const config = readProjectConfig(projectDirectory)
  const sourceRoot = resolve(harnessDirectory, 'skills')
  const results = []

  for (const targetDirectory of config.adapters.skillDirectories) {
    for (const skillName of config.skills) {
      const source = resolve(sourceRoot, skillName)
      const target = resolve(projectDirectory, targetDirectory, skillName)
      if (!existsSync(source)) {
        results.push({ status: 'error', target, message: `Unknown Harness skill: ${skillName}` })
        continue
      }

      if (existsSync(target)) {
        if (hashDirectory(source) === hashDirectory(target)) {
          results.push({ status: 'unchanged', target, message: 'already synchronized' })
          continue
        }
        if (!force) {
          results.push({
            status: 'conflict',
            target,
            message: 'content differs; inspect it or rerun with --force to overwrite',
          })
          continue
        }
        rmSync(target, { recursive: true, force: true })
      }

      mkdirSync(dirname(target), { recursive: true })
      cpSync(source, target, { recursive: true, force })
      results.push({ status: existsSync(target) ? 'synced' : 'error', target, message: 'synchronized' })
    }
  }

  return results.map((result) => ({ ...result, target: relative(projectDirectory, result.target) }))
}

function hashDirectory(directory) {
  const hash = createHash('sha256')
  for (const path of listFiles(directory)) {
    hash.update(relative(directory, path))
    hash.update(readFileSync(path))
  }
  return hash.digest('hex')
}

function listFiles(directory) {
  const paths = []
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) paths.push(...listFiles(path))
    else if (statSync(path).isFile()) paths.push(path)
  }
  return paths
}
