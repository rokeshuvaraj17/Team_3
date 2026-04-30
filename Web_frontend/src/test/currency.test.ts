import { describe, it, expect } from 'vitest'
import { COUNTRY_CURRENCY, formatSalaryByCountry } from '@/lib/currency'

describe('COUNTRY_CURRENCY', () => {
  it('has an entry for "us" with correct fields', () => {
    expect(COUNTRY_CURRENCY.us).toMatchObject({ code: 'USD', symbol: '$', name: 'US Dollar' })
  })

  it('every entry has a code, symbol, and name', () => {
    for (const curr of Object.values(COUNTRY_CURRENCY)) {
      expect(typeof curr.code).toBe('string')
      expect(typeof curr.symbol).toBe('string')
      expect(typeof curr.name).toBe('string')
    }
  })
})

describe('formatSalaryByCountry', () => {
  it('returns "Not disclosed" when both min and max are null', () => {
    expect(formatSalaryByCountry('us', null, null)).toBe('Not disclosed')
  })

  it('returns "Not disclosed" when both min and max are omitted', () => {
    expect(formatSalaryByCountry('us')).toBe('Not disclosed')
  })

  it('formats a USD range', () => {
    expect(formatSalaryByCountry('us', 50000, 100000)).toBe('$ 50k - 100k PA')
  })

  it('formats a min-only USD salary', () => {
    expect(formatSalaryByCountry('us', 60000)).toBe('$ 60k+ PA')
  })

  it('formats a max-only USD salary', () => {
    expect(formatSalaryByCountry('us', null, 80000)).toBe('Up to $ 80k PA')
  })

  it('uses GBP symbol for "gb"', () => {
    expect(formatSalaryByCountry('gb', 40000, 60000)).toBe('£ 40k - 60k PA')
  })

  it('formats Indian Rupee salaries >= 1 Lac as Lacs', () => {
    expect(formatSalaryByCountry('in', 500000, 1000000)).toBe('₹ 5.0 Lacs - 10.0 Lacs PA')
  })

  it('formats Indian Rupee salaries below 1 Lac as k', () => {
    expect(formatSalaryByCountry('in', 50000, 90000)).toBe('₹ 50k - 90k PA')
  })

  it('formats small values (below 1000) as plain numbers', () => {
    expect(formatSalaryByCountry('us', 500, 900)).toBe('$ 500 - 900 PA')
  })

  it('falls back to USD for an unrecognised country code', () => {
    expect(formatSalaryByCountry('xx', 70000, 120000)).toBe('$ 70k - 120k PA')
  })

  it('is case-insensitive for the country code', () => {
    expect(formatSalaryByCountry('US', 50000, 100000)).toBe('$ 50k - 100k PA')
  })

  it('handles exactly 1 Lac (100000 INR) as Lacs', () => {
    expect(formatSalaryByCountry('in', 100000)).toBe('₹ 1.0 Lacs+ PA')
  })

  it('handles exactly 1000 as "1k"', () => {
    expect(formatSalaryByCountry('us', 1000)).toBe('$ 1k+ PA')
  })
})
