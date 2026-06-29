const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SignUpErrors = {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export function validateSignUp(values: {
  name: string
  email: string
  password: string
  confirmPassword: string
}): SignUpErrors {
  const errors: SignUpErrors = {}
  const name = values.name.trim()
  const email = values.email.trim()

  if (!name) {
    errors.name = 'Name is required'
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters'
  }

  if (!email) {
    errors.email = 'Email is required'
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Please enter a valid email address'
  }

  if (!values.password) {
    errors.password = 'Password is required'
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  return errors
}
