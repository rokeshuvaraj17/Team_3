/*
 * DJC 4/30/2026 - Issue 48 - Created tests for frontend lib functions. Claude Code 
 * used with prompt: "Create unit tests for all functions exported from src/lib. 
 * Exclude tests which require database or server calls."
*/

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getSavedJobIds,
  getHiddenJobIds,
  getSavedJobsData,
  toggleSaved,
  isSaved,
  hideJob,
  isHidden,
} from '@/lib/savedJobs'

beforeEach(() => localStorage.clear())

describe('getSavedJobIds', () => {
  it('returns an empty set when nothing is stored', () => {
    expect(getSavedJobIds().size).toBe(0)
  })

  it('returns the stored job IDs', () => {
    localStorage.setItem('job_portal_saved_external', JSON.stringify(['a', 'b']))
    const ids = getSavedJobIds()
    expect(ids.has('a')).toBe(true)
    expect(ids.has('b')).toBe(true)
  })

  it('filters out non-string entries', () => {
    localStorage.setItem('job_portal_saved_external', JSON.stringify(['a', 1, null]))
    expect(getSavedJobIds().size).toBe(1)
  })

  it('returns an empty set for malformed JSON', () => {
    localStorage.setItem('job_portal_saved_external', 'bad-json')
    expect(getSavedJobIds().size).toBe(0)
  })
})

describe('getHiddenJobIds', () => {
  it('returns an empty set when nothing is stored', () => {
    expect(getHiddenJobIds().size).toBe(0)
  })

  it('returns the stored hidden IDs', () => {
    localStorage.setItem('job_portal_hidden_external', JSON.stringify(['x']))
    expect(getHiddenJobIds().has('x')).toBe(true)
  })
})

describe('getSavedJobsData', () => {
  it('returns an empty object when nothing is stored', () => {
    expect(getSavedJobsData()).toEqual({})
  })

  it('returns the stored job data', () => {
    const data = { job1: { title: 'Developer' } }
    localStorage.setItem('job_portal_saved_jobs_data', JSON.stringify(data))
    expect(getSavedJobsData()).toEqual(data)
  })

  it('returns an empty object for malformed JSON', () => {
    localStorage.setItem('job_portal_saved_jobs_data', 'invalid')
    expect(getSavedJobsData()).toEqual({})
  })
})

describe('toggleSaved', () => {
  it('saves a job and returns true', () => {
    expect(toggleSaved('job1')).toBe(true)
    expect(isSaved('job1')).toBe(true)
  })

  it('unsaves an already-saved job and returns false', () => {
    toggleSaved('job1')
    expect(toggleSaved('job1')).toBe(false)
    expect(isSaved('job1')).toBe(false)
  })

  it('stores the payload when saving', () => {
    const payload = { title: 'Engineer' }
    toggleSaved('job2', payload)
    expect(getSavedJobsData()['job2']).toEqual(payload)
  })

  it('removes the payload when unsaving', () => {
    toggleSaved('job2', { title: 'Engineer' })
    toggleSaved('job2')
    expect(getSavedJobsData()['job2']).toBeUndefined()
  })

  it('does not store payload when undefined is passed', () => {
    toggleSaved('job3', undefined)
    expect(getSavedJobsData()['job3']).toBeUndefined()
  })
})

describe('isSaved', () => {
  it('returns false for an unsaved job', () => {
    expect(isSaved('unknown')).toBe(false)
  })

  it('returns true for a saved job', () => {
    toggleSaved('job4')
    expect(isSaved('job4')).toBe(true)
  })
})

describe('hideJob', () => {
  it('marks a job as hidden', () => {
    hideJob('job5')
    expect(isHidden('job5')).toBe(true)
  })

  it('is idempotent — hiding the same job twice does not duplicate the entry', () => {
    hideJob('job5')
    hideJob('job5')
    expect(getHiddenJobIds().size).toBe(1)
  })
})

describe('isHidden', () => {
  it('returns false for a job that has not been hidden', () => {
    expect(isHidden('job6')).toBe(false)
  })

  it('returns true after the job is hidden', () => {
    hideJob('job6')
    expect(isHidden('job6')).toBe(true)
  })
})
