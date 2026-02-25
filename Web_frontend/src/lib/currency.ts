/** Country code (e.g. from Adzuna) -> currency display */
export const COUNTRY_CURRENCY: Record<string, { code: string; symbol: string; name: string }> = {
  us: { code: 'USD', symbol: '$', name: 'US Dollar' },
  gb: { code: 'GBP', symbol: '£', name: 'British Pound' },
  in: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  au: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  de: { code: 'EUR', symbol: '€', name: 'Euro' },
  br: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  ca: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  fr: { code: 'EUR', symbol: '€', name: 'Euro' },
  jp: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
}

export function formatSalaryByCountry(
  country: string,
  min?: number | null,
  max?: number | null
): string {
  if (min == null && max == null) return 'Not disclosed'
  const key = (country || 'us').toLowerCase().slice(0, 2)
  const curr = COUNTRY_CURRENCY[key] ?? COUNTRY_CURRENCY.us

  const format = (n: number) => {
    if (curr.code === 'INR' && n >= 100000) return `${(n / 100000).toFixed(1)} Lacs`
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`
    return String(Math.round(n))
  }

  if (min != null && max != null) {
    return `${curr.symbol} ${format(min)} - ${format(max)} PA`
  }
  if (min != null) return `${curr.symbol} ${format(min)}+ PA`
  if (max != null) return `Up to ${curr.symbol} ${format(max)} PA`
  return 'Not disclosed'
}
