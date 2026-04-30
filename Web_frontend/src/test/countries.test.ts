import { describe, it, expect } from 'vitest'
import { COUNTRIES, getCountryName } from '@/lib/countries'

describe('COUNTRIES', () => {
  it('is a non-empty array', () => {
    expect(COUNTRIES.length).toBeGreaterThan(0)
  })

  it('each entry has a string code and string name', () => {
    for (const c of COUNTRIES) {
      expect(typeof c.code).toBe('string')
      expect(typeof c.name).toBe('string')
    }
  })

  it('is sorted alphabetically by name', () => {
    const names = COUNTRIES.map((c) => c.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sorted)
  })

  it('contains well-known countries', () => {
    const codes = COUNTRIES.map((c) => c.code)
    expect(codes).toContain('US')
    expect(codes).toContain('GB')
    expect(codes).toContain('IN')
  })
})

describe('getCountryName', () => {
  it('returns the name for a known code', () => {
    expect(getCountryName('US')).toBe('United States')
  })

  it('returns the name for another known code', () => {
    expect(getCountryName('IN')).toBe('India')
  })

  it('returns the code itself for an unrecognised code', () => {
    expect(getCountryName('XX')).toBe('XX')
  })

  it('returns an empty string for null', () => {
    expect(getCountryName(null)).toBe('')
  })

  it('returns an empty string for an empty string', () => {
    expect(getCountryName('')).toBe('')
  })
})
