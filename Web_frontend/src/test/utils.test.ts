/*
 * DJC 4/30/2026 - Issue 48 - Created tests for frontend lib functions. Claude Code 
 * used with prompt: "Create unit tests for all functions exported from src/lib. 
 * Exclude tests which require database or server calls."
*/

import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo')
  })

  it('merges multiple classes with a space', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('ignores undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('resolves Tailwind conflicts — last value wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('supports conditional classes via objects', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500')
  })

  it('supports conditional classes via arrays', () => {
    expect(cn(['foo', false && 'bar'])).toBe('foo')
  })

  it('returns an empty string when called with no arguments', () => {
    expect(cn()).toBe('')
  })
})
