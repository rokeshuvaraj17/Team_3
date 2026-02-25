const SAVED_KEY = 'job_portal_saved_external'
const SAVED_JOBS_DATA_KEY = 'job_portal_saved_jobs_data'
const HIDDEN_KEY = 'job_portal_hidden_external'

function getIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

function setIds(key: string, ids: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...ids]))
}

export function getSavedJobIds(): Set<string> {
  return getIds(SAVED_KEY)
}

export function getHiddenJobIds(): Set<string> {
  return getIds(HIDDEN_KEY)
}

/** Stored saved job payloads: record of id -> job (for Saved tab) */
export function getSavedJobsData(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(SAVED_JOBS_DATA_KEY)
    if (!raw) return {}
    const obj = JSON.parse(raw) as unknown
    return typeof obj === 'object' && obj !== null ? (obj as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function setSavedJobsData(data: Record<string, unknown>) {
  localStorage.setItem(SAVED_JOBS_DATA_KEY, JSON.stringify(data))
}

export function toggleSaved(jobId: string, jobPayload?: unknown): boolean {
  const set = getIds(SAVED_KEY)
  const data = getSavedJobsData()
  if (set.has(jobId)) {
    set.delete(jobId)
    delete data[jobId]
  } else {
    set.add(jobId)
    if (jobPayload !== undefined) data[jobId] = jobPayload
  }
  setIds(SAVED_KEY, set)
  setSavedJobsData(data)
  return set.has(jobId)
}

export function isSaved(jobId: string): boolean {
  return getIds(SAVED_KEY).has(jobId)
}

export function hideJob(jobId: string): void {
  const set = getIds(HIDDEN_KEY)
  set.add(jobId)
  setIds(HIDDEN_KEY, set)
}

export function isHidden(jobId: string): boolean {
  return getIds(HIDDEN_KEY).has(jobId)
}
