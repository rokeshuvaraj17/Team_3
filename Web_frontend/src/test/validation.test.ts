import { describe, it, expect } from 'vitest'
import { validateSignUp } from '@/lib/validation'

const valid = {
  name: 'Alice',
  email: 'alice@example.com',
  password: 'password123',
  confirmPassword: 'password123',
}

describe('validateSignUp', () => {
  it('returns no errors for a fully valid input', () => {
    expect(validateSignUp(valid)).toEqual({})
  })

  describe('name', () => {
    it('errors when name is empty', () => {
      expect(validateSignUp({ ...valid, name: '' }).name).toBe('Name is required')
    })

    it('errors when name is only whitespace', () => {
      expect(validateSignUp({ ...valid, name: '   ' }).name).toBe('Name is required')
    })

    it('errors when trimmed name is a single character', () => {
      expect(validateSignUp({ ...valid, name: 'A' }).name).toBe(
        'Name must be at least 2 characters',
      )
    })

    it('accepts a name with exactly 2 characters', () => {
      expect(validateSignUp({ ...valid, name: 'Al' }).name).toBeUndefined()
    })
  })

  describe('email', () => {
    it('errors when email is empty', () => {
      expect(validateSignUp({ ...valid, email: '' }).email).toBe('Email is required')
    })

    it('errors for an email without @', () => {
      expect(validateSignUp({ ...valid, email: 'notanemail' }).email).toBe(
        'Please enter a valid email address',
      )
    })

    it('errors for an email missing the domain part', () => {
      expect(validateSignUp({ ...valid, email: 'user@' }).email).toBe(
        'Please enter a valid email address',
      )
    })

    it('errors for an email with spaces', () => {
      expect(validateSignUp({ ...valid, email: 'user @domain.com' }).email).toBe(
        'Please enter a valid email address',
      )
    })

    it('accepts a valid email address', () => {
      expect(validateSignUp({ ...valid, email: 'user@domain.com' }).email).toBeUndefined()
    })
  })

  describe('password', () => {
    it('errors when password is empty', () => {
      expect(
        validateSignUp({ ...valid, password: '', confirmPassword: '' }).password,
      ).toBe('Password is required')
    })

    it('errors when password is fewer than 8 characters', () => {
      expect(
        validateSignUp({ ...valid, password: 'short', confirmPassword: 'short' }).password,
      ).toBe('Password must be at least 8 characters')
    })

    it('accepts a password with exactly 8 characters', () => {
      expect(
        validateSignUp({ ...valid, password: '12345678', confirmPassword: '12345678' }).password,
      ).toBeUndefined()
    })
  })

  describe('confirmPassword', () => {
    it('errors when confirmPassword is empty', () => {
      expect(validateSignUp({ ...valid, confirmPassword: '' }).confirmPassword).toBe(
        'Please confirm your password',
      )
    })

    it('errors when passwords do not match', () => {
      expect(
        validateSignUp({ ...valid, confirmPassword: 'different123' }).confirmPassword,
      ).toBe('Passwords do not match')
    })

    it('accepts matching passwords', () => {
      expect(validateSignUp(valid).confirmPassword).toBeUndefined()
    })
  })
})
