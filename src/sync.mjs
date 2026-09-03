import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { readProjectConfig } from './config.mjs'

const LOCK_FILENAME = '.harness/skill-lock.json'

export function syncSkills({ harnessDirectory, projectDirectory, force = false }) {
  const config = readProjectConfig(projectDirectory)
  const sourceRoot = resolve(harnessDirectory, 'skills')
  const results = []
  const lock = readSkillLock(projectDirectory)

  for (const targetDirectory of config.adapters.skillDirectories) {
    for (const skillName of config.skills) {
      const source = resolve(sourceRoot, skillName)
      const target = resolve(projectDirectory, targetDirectory, skillName)
      const targetKey = portablePath(relative(projectDirectory, target))
      if (!existsSync(source)) {
        results.push({ status: 'error', target, message: `Unknown Harness skill: ${skillName}` })
        continue
      }

      const sourceHash = hashDirectory(source)

      if (existsSync(target)) {
        const targetHash = hashDirectory(target)
        if (sourceHash === targetHash) {
          lock.entries[targetKey] = { skill: skillName, hash: sourceHash }
          results.push({ status: 'unchanged', target, message: 'already synchronized' })
          continue
        }
        const managedAndUnmodified = lock.entries[targetKey]?.hash === targetHash
        if (!force && !managedAndUnmodified) {
          results.push({
            status: 'conflict',
            target,
            message: 'local content differs from the last managed version; inspect it or rerun with --force',
          })
          continue
        }
        rmSync(target, { recursive: true, force: true })
        mkdirSync(dirname(target), { recursive: true })
        cpSync(source, target, { recursive: true })
        lock.entries[targetKey] = { skill: skillName, hash: sourceHash }
        results.push({
          status: managedAndUnmodified && !force ? 'updated' : 'synced',
          target,
          message: managedAndUnmodified && !force ? 'updated managed skill' : 'synchronized with explicit override',
        })
        continue
      }

      mkdirSync(dirname(target), { recursive: true })
      cpSync(source, target, { recursive: true })
      lock.entries[targetKey] = { skill: skillName, hash: sourceHash }
      results.push({ status: existsSync(target) ? 'synced' : 'error', target, message: 'synchronized' })
    }
  }

  writeSkillLock(projectDirectory, lock)
  return results.map((result) => ({ ...result, target: relative(projectDirectory, result.target) }))
}

function readSkillLock(projectDirectory) {
  const path = resolve(projectDirectory, LOCK_FILENAME)
  if (!existsSync(path)) return { schemaVersion: 1, entries: {} }
  try {
    const lock = JSON.parse(readFileSync(path, 'utf8'))
    if (lock?.schemaVersion !== 1 || !lock.entries || typeof lock.entries !== 'object') {
      throw new Error('expected schemaVersion 1 and an entries object')
    }
    return lock
  } catch (error) {
    throw new Error(`Cannot read managed Skill lock ${path}: ${error.message}`)
  }
}

function writeSkillLock(projectDirectory, lock) {
  const path = resolve(projectDirectory, LOCK_FILENAME)
  const temporaryPath = `${path}.tmp`
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(temporaryPath, `${JSON.stringify(lock, null, 2)}\n`)
  renameSync(temporaryPath, path)
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

function portablePath(path) {
  return path.split('\\').join('/')
}
