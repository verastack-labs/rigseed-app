import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guards the @theme inline block against two failure modes that are silent.
 *
 * Both were hit in practice. A key whose name matches the token it points at
 * is a self-referential cycle and resolves to nothing. A key under the wrong
 * namespace is accepted without complaint and simply generates no utility, so
 * the class name is inert and the property falls back to a default.
 *
 * Neither shows up in typecheck, lint or a build. Only reading the output
 * catches them, so this reads the source instead and asserts the shape.
 */
const css = readFileSync(resolve(process.cwd(), 'src/styles/globals.css'), 'utf8')

const themeBlock = css.slice(css.indexOf('@theme inline'), css.indexOf('@layer base'))

const declarations = [...themeBlock.matchAll(/^\s*(--[\w-]+):\s*var\((--[\w-]+)\);/gm)].map(
  ([, key, source]) => ({ key: key!, source: source! }),
)

describe('@theme inline', () => {
  it('declares something', () => {
    expect(declarations.length).toBeGreaterThan(20)
  })

  it('never points a key at itself', () => {
    const cycles = declarations.filter((d) => d.key === d.source)
    expect(cycles).toEqual([])
  })

  it('puts durations under the transition-duration namespace', () => {
    // --duration-* is accepted silently and generates no utility at all.
    const wrong = declarations.filter((d) => /^--duration-/.test(d.key))
    expect(wrong).toEqual([])

    const durations = declarations.filter((d) => /^--transition-duration-/.test(d.key))
    expect(durations.length).toBeGreaterThanOrEqual(4)
    for (const d of durations) expect(d.source).toMatch(/^--dur-/)
  })

  it('maps every easing from a token', () => {
    const eases = declarations.filter((d) => /^--ease-/.test(d.key))
    expect(eases.length).toBeGreaterThanOrEqual(3)
    for (const d of eases) expect(d.source).toMatch(/^--ease-/)
  })

  it('keeps the colour keys namespaced so they cannot collide with tokens', () => {
    const colours = declarations.filter((d) => /^--color-/.test(d.key))
    expect(colours.length).toBeGreaterThanOrEqual(15)
    for (const d of colours) expect(d.source).not.toBe(d.key)
  })
})
