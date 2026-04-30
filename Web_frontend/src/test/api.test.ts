/*
 * DJC 4/30/2026 - Issue 48 - Created tests for frontend lib functions. Claude Code 
 * used with prompt: "Create unit tests for all functions exported from src/lib. 
 * Exclude tests which require database or server calls."
*/

import { describe, it, expect } from 'vitest'
import { apiBase, apiUrl } from '@/lib/api'

describe('apiBase', () => {
  it('is a string', () => {
    expect(typeof apiBase).toBe('string')
  })
})

describe('apiUrl', () => {
  it('preserves a path that already has a leading slash', () => {
    expect(apiUrl('/api/health')).toBe(`${apiBase}/api/health`)
  })

  it('adds a leading slash when the path has none', () => {
    expect(apiUrl('api/health')).toBe(`${apiBase}/api/health`)
  })

  it('handles an empty path by returning just a slash', () => {
    expect(apiUrl('')).toBe(`${apiBase}/`)
  })

  it('prepends apiBase to the resolved path', () => {
    const result = apiUrl('/foo/bar')
    expect(result.endsWith('/foo/bar')).toBe(true)
  })
})
