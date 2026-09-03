import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function validateSkill(skillDirectory) {
  const errors = []
  const skillPath = resolve(skillDirectory, 'SKILL.md')
  if (!existsSync(skillPath)) return { name: basename(skillDirectory), errors: ['SKILL.md is missing.'] }

  const content = readFileSync(skillPath, 'utf8')
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!frontmatter) return { name: basename(skillDirectory), errors: ['SKILL.md must start with YAML frontmatter.'] }

  const name = readScalar(frontmatter[1], 'name')
  const description = readScalar(frontmatter[1], 'description')
  if (!name) errors.push('Frontmatter name is required.')
  if (name && !NAME_PATTERN.test(name)) errors.push('Frontmatter name must use lowercase kebab-case.')
  if (name && name !== basename(resolve(skillDirectory))) {
    errors.push(`Frontmatter name \`${name}\` must match directory name \`${basename(resolve(skillDirectory))}\`.`)
  }
  if (!description) errors.push('Frontmatter description is required.')
  if (description && description.length < 24) errors.push('Description is too short to route the skill reliably.')
  if (!content.slice(frontmatter[0].length).trim()) errors.push('Skill instructions are empty.')

  return { name: name || basename(skillDirectory), errors }
}

export function validateSkillsDirectory(skillsDirectory) {
  if (!existsSync(skillsDirectory)) return [{ name: basename(skillsDirectory), errors: ['Skills directory is missing.'] }]
  return readdirSync(skillsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => validateSkill(resolve(skillsDirectory, entry.name)))
}

function readScalar(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))
  return match?.[1]?.replace(/^['"]|['"]$/g, '').trim() || null
}
