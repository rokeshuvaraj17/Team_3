const STORAGE_KEY = 'job_portal_user'

export type StoredUser = {
  id: string
  name?: string
  email?: string
  email_verified?: boolean
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredUser
    return data?.id ? data : null
  } catch {
    return null
  }
}

export function setStoredUser(user: StoredUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    // ignore
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
