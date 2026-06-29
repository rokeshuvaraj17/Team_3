/*
 * DJC 4/30/2026 - Issue 48 - Created tests for frontend lib functions. Claude Code 
 * used with prompt: "Create unit tests for all functions exported from src/lib. 
 * Exclude tests which require database or server calls."
*/

import { describe, it, expect, beforeEach } from 'vitest'
import { getStoredUser, setStoredUser, clearStoredUser } from '@/lib/auth'

const STORAGE_KEY = 'job_portal_user'

describe('getStoredUser', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when nothing is stored', () => {
    expect(getStoredUser()).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    expect(getStoredUser()).toBeNull()
  })

  it('returns null when stored object has no id', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'Alice' }))
    expect(getStoredUser()).toBeNull()
  })

  it('returns the stored user when valid', () => {
    const user = { id: '1', name: 'Alice', email: 'alice@example.com' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    expect(getStoredUser()).toEqual(user)
  })

  it('returns a user with only id set', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: '99' }))
    expect(getStoredUser()).toEqual({ id: '99' })
  })
})

describe('setStoredUser', () => {
  beforeEach(() => localStorage.clear())

  it('persists the user so getStoredUser returns it', () => {
    const user = { id: '42', email: 'bob@example.com' }
    setStoredUser(user)
    expect(getStoredUser()).toEqual(user)
  })

  it('overwrites a previously stored user', () => {
    setStoredUser({ id: '1', name: 'Old' })
    setStoredUser({ id: '2', name: 'New' })
    expect(getStoredUser()?.name).toBe('New')
  })
})

describe('clearStoredUser', () => {
  beforeEach(() => localStorage.clear())

  it('removes the stored user', () => {
    setStoredUser({ id: '1' })
    clearStoredUser()
    expect(getStoredUser()).toBeNull()
  })

  it('is a no-op when nothing is stored', () => {
    expect(() => clearStoredUser()).not.toThrow()
    expect(getStoredUser()).toBeNull()
  })
})
