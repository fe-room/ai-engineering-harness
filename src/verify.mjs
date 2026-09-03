import { spawnSync } from 'node:child_process'
import { readProjectConfig } from './config.mjs'

export function verifyProject(projectDirectory, output = console.log) {
  const config = readProjectConfig(projectDirectory)
  if (config.commands.verify.length === 0) {
    output('[WARN] No verification commands are configured.')
    return 2
  }

  for (const command of config.commands.verify) {
    output(`[RUN] ${command}`)
    const result = spawnSync(command, {
      cwd: projectDirectory,
      shell: true,
      stdio: 'inherit',
    })
    if (result.error) {
      output(`[FAIL] ${result.error.message}`)
      return 1
    }
    if (result.status !== 0) {
      output(`[FAIL] Command exited with status ${result.status}.`)
      return result.status || 1
    }
  }

  output('[PASS] All configured verification commands passed.')
  return 0
}
