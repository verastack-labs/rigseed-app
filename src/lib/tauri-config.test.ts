import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import schema from '@tauri-apps/cli/config.schema.json' with { type: 'json' }

/**
 * Tauri configs are strict JSON with `additionalProperties: false`, and nothing
 * else in CI reads them. The verify job runs the Vite build, not `tauri build`,
 * so a config Tauri rejects passes every check and then fails on the release
 * runner, after the whole Rust build has already been paid for.
 *
 * That happened. A `$comment` key was added inside `bundle` to explain why the
 * Linux targets are narrowed, and Tauri answered `Additional properties are not
 * allowed ('$comment' was unexpected)`, which meant no Linux release could
 * build at all. It surfaced from a build run by hand in WSL, which is not
 * something CI does.
 */
const CONFIGS = [
  'tauri.conf.json',
  'tauri.linux.conf.json',
  'tauri.macos.conf.json',
  'tauri.windows.conf.json',
] as const

const DIR = join(__dirname, '..', '..', 'src-tauri')

const read = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(DIR, name), 'utf8')) as Record<string, unknown>

const properties = (definition: string): Set<string> => {
  const defs = (schema as unknown as { definitions: Record<string, { properties?: object }> })
    .definitions
  const found = defs[definition]?.properties
  if (!found) throw new Error(`${definition} is not in the schema`)
  return new Set(Object.keys(found))
}

describe('tauri configs', () => {
  it.each(CONFIGS)('%s is valid JSON', (name) => {
    expect(() => read(name)).not.toThrow()
  })

  it.each(CONFIGS)('%s uses only bundle keys the schema allows', (name) => {
    const bundle = read(name).bundle as Record<string, unknown> | undefined
    if (bundle === undefined) return
    const allowed = properties('BundleConfig')
    expect(Object.keys(bundle).filter((key) => !allowed.has(key))).toEqual([])
  })

  it.each(CONFIGS)('%s uses only top-level keys the schema allows', (name) => {
    // $schema is a JSON Schema convention rather than a Tauri field. The CLI
    // accepts it at the root and nowhere deeper.
    const allowed = new Set([
      ...Object.keys((schema as unknown as { properties: object }).properties),
      '$schema',
    ])
    expect(Object.keys(read(name)).filter((key) => !allowed.has(key))).toEqual([])
  })

  it('takes the version from package.json instead of repeating the number', () => {
    // Two places holding one number is how they drift, which is what this
    // replaced. If it ever goes back to a literal, the only thing left that
    // would notice is a filename check in the release workflow.
    expect(read('tauri.conf.json').version).toBe('../package.json')
  })
})
