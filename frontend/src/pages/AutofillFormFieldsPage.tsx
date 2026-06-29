import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'
import { COUNTRIES } from '@/lib/countries'
import {
  FormInput,
  Loader2,
  Save,
  Settings,
  User,
  MapPin,
  Briefcase,
  GraduationCap,
  Shield,
  DollarSign,
  FileText,
  X,
  Plus,
  Trash2,
  Key,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const inputClass =
  'flex h-10 w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-700 dark:border-slate-600 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow'
const labelClass = 'text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block'

export const AUTOFILL_FIELD_KEYS = [
  'first_name', 'middle_name', 'last_name', 'suffix', 'full_name', 'preferred_name', 'pronouns',
  'email', 'phone', 'phone_alt', 'email_alt',
  'date_of_birth', 'age', 'place_of_birth', 'citizenship_country', 'nationality',
  'linkedin_url', 'website_url', 'portfolio_url', 'github_url', 'twitter_url',
  'address_line1', 'address_line2', 'city', 'state', 'zip_code', 'country',
  'headline', 'summary', 'current_job_title', 'current_company', 'years_of_experience', 'job_type_preference',
  'work_authorization', 'requires_sponsorship', 'veteran_status', 'disability_status', 'race_ethnicity', 'gender',
  'salary_expectation_min', 'salary_expectation_max', 'salary_type', 'salary_currency',
  'highest_degree', 'university_name', 'graduation_year', 'major_field', 'gpa', 'second_degree', 'second_major',
  'how_did_you_hear', 'referral_employee_name', 'desired_start_date', 'willing_to_relocate', 'willing_to_travel', 'notice_period',
  'cover_letter_note', 'emergency_contact_name', 'emergency_contact_phone', 'driver_license_number', 'security_clearance', 'ssn_last4',
] as const

type AutofillData = Record<string, string>

const FIELD_META: { key: string; label: string; type: string; placeholder?: string; section: string; options?: { value: string; label: string }[] }[] = [
  { key: 'first_name', label: 'First name', type: 'text', placeholder: 'Given name', section: 'personal' },
  { key: 'middle_name', label: 'Middle name', type: 'text', placeholder: 'Middle name', section: 'personal' },
  { key: 'last_name', label: 'Last name', type: 'text', placeholder: 'Family name', section: 'personal' },
  { key: 'suffix', label: 'Suffix', type: 'text', placeholder: 'Jr., Sr., III', section: 'personal' },
  { key: 'full_name', label: 'Full name', type: 'text', placeholder: 'Full legal name', section: 'personal' },
  { key: 'preferred_name', label: 'Preferred name', type: 'text', placeholder: 'Name you go by', section: 'personal' },
  { key: 'pronouns', label: 'Pronouns', type: 'select', section: 'personal', options: [
    { value: '', label: 'Prefer not to say' },
    { value: 'he_him', label: 'He/Him' },
    { value: 'she_her', label: 'She/Her' },
    { value: 'they_them', label: 'They/Them' },
    { value: 'other', label: 'Other' },
  ] },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', section: 'personal' },
  { key: 'email_alt', label: 'Alternate email', type: 'email', placeholder: 'Backup email', section: 'personal' },
  { key: 'phone', label: 'Phone', type: 'tel', placeholder: 'Primary phone', section: 'personal' },
  { key: 'phone_alt', label: 'Alternate phone', type: 'tel', placeholder: 'Secondary phone', section: 'personal' },
  { key: 'date_of_birth', label: 'Date of birth', type: 'text', placeholder: 'e.g. 1990-01-15', section: 'personal' },
  { key: 'age', label: 'Age', type: 'text', placeholder: 'e.g. 32', section: 'personal' },
  { key: 'place_of_birth', label: 'Place of birth', type: 'text', placeholder: 'City, Country', section: 'personal' },
  { key: 'citizenship_country', label: 'Citizenship country', type: 'country', section: 'personal' },
  { key: 'nationality', label: 'Nationality', type: 'text', placeholder: 'e.g. American', section: 'personal' },
  { key: 'linkedin_url', label: 'LinkedIn URL', type: 'url', placeholder: 'https://linkedin.com/in/...', section: 'personal' },
  { key: 'website_url', label: 'Website', type: 'url', placeholder: 'https://...', section: 'personal' },
  { key: 'portfolio_url', label: 'Portfolio URL', type: 'url', placeholder: 'https://...', section: 'personal' },
  { key: 'github_url', label: 'GitHub URL', type: 'url', placeholder: 'https://github.com/...', section: 'personal' },
  { key: 'twitter_url', label: 'Twitter / X URL', type: 'url', placeholder: 'https://twitter.com/...', section: 'personal' },
  { key: 'address_line1', label: 'Address line 1', type: 'text', placeholder: 'Street address', section: 'address' },
  { key: 'address_line2', label: 'Address line 2', type: 'text', placeholder: 'Apt, suite, etc.', section: 'address' },
  { key: 'city', label: 'City', type: 'text', placeholder: 'City', section: 'address' },
  { key: 'state', label: 'State / Province', type: 'text', placeholder: 'State or region', section: 'address' },
  { key: 'zip_code', label: 'ZIP / Postal code', type: 'text', placeholder: 'ZIP or postal code', section: 'address' },
  { key: 'country', label: 'Country', type: 'country', placeholder: 'Country', section: 'address' },
  { key: 'headline', label: 'Headline', type: 'text', placeholder: 'e.g. Software Engineer', section: 'professional' },
  { key: 'current_job_title', label: 'Current job title', type: 'text', placeholder: 'Your current role', section: 'professional' },
  { key: 'current_company', label: 'Current company', type: 'text', placeholder: 'Employer name', section: 'professional' },
  { key: 'years_of_experience', label: 'Years of experience', type: 'text', placeholder: 'e.g. 5', section: 'professional' },
  { key: 'job_type_preference', label: 'Job type preference', type: 'select', section: 'professional', options: [
    { value: '', label: 'Select' },
    { value: 'full_time', label: 'Full-time' },
    { value: 'part_time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'freelance', label: 'Freelance' },
  ] },
  { key: 'summary', label: 'Professional summary', type: 'textarea', placeholder: 'Brief bio used on applications', section: 'professional' },
  { key: 'work_authorization', label: 'Work authorization', type: 'select', section: 'eeo', options: [
    { value: '', label: 'Prefer not to set' },
    { value: 'authorized_us', label: 'Authorized to work in the US' },
    { value: 'authorized_other', label: 'Authorized to work in other country' },
    { value: 'require_sponsorship', label: 'Will require sponsorship' },
  ] },
  { key: 'requires_sponsorship', label: 'Requires sponsorship?', type: 'select', section: 'eeo', options: [
    { value: '', label: 'Prefer not to set' },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ] },
  { key: 'veteran_status', label: 'Veteran status (voluntary)', type: 'select', section: 'eeo', options: [
    { value: '', label: 'Prefer not to answer' },
    { value: 'not_veteran', label: 'I am not a protected veteran' },
    { value: 'veteran', label: 'I identify as a protected veteran' },
    { value: 'decline', label: 'Decline to self-identify' },
  ] },
  { key: 'disability_status', label: 'Disability status (voluntary)', type: 'select', section: 'eeo', options: [
    { value: '', label: 'Prefer not to answer' },
    { value: 'yes', label: 'Yes, I have a disability' },
    { value: 'no', label: 'No, I don\'t have a disability' },
    { value: 'decline', label: 'Decline to self-identify' },
  ] },
  { key: 'race_ethnicity', label: 'Race / Ethnicity (voluntary EEO)', type: 'select', section: 'eeo', options: [
    { value: '', label: 'Prefer not to answer' },
    { value: 'white', label: 'White' },
    { value: 'black', label: 'Black or African American' },
    { value: 'hispanic', label: 'Hispanic or Latino' },
    { value: 'asian', label: 'Asian' },
    { value: 'native', label: 'American Indian or Alaska Native' },
    { value: 'pacific', label: 'Native Hawaiian or Pacific Islander' },
    { value: 'two_or_more', label: 'Two or more races' },
    { value: 'decline', label: 'Decline to self-identify' },
  ] },
  { key: 'gender', label: 'Gender (voluntary)', type: 'select', section: 'eeo', options: [
    { value: '', label: 'Prefer not to answer' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non_binary', label: 'Non-binary' },
    { value: 'decline', label: 'Decline to self-identify' },
  ] },
  { key: 'salary_expectation_min', label: 'Salary expectation (min)', type: 'text', placeholder: 'e.g. 80000', section: 'salary' },
  { key: 'salary_expectation_max', label: 'Salary expectation (max)', type: 'text', placeholder: 'e.g. 120000', section: 'salary' },
  { key: 'salary_type', label: 'Salary type', type: 'select', section: 'salary', options: [
    { value: '', label: 'Not specified' },
    { value: 'annual', label: 'Annual' },
    { value: 'hourly', label: 'Hourly' },
  ] },
  { key: 'salary_currency', label: 'Salary currency', type: 'text', placeholder: 'e.g. USD', section: 'salary' },
  { key: 'highest_degree', label: 'Highest degree', type: 'select', section: 'education', options: [
    { value: '', label: 'Select' },
    { value: 'high_school', label: 'High school' },
    { value: 'associate', label: 'Associate' },
    { value: 'bachelor', label: 'Bachelor\'s' },
    { value: 'master', label: 'Master\'s' },
    { value: 'doctorate', label: 'Doctorate' },
    { value: 'other', label: 'Other' },
  ] },
  { key: 'university_name', label: 'University / College', type: 'text', placeholder: 'Institution name', section: 'education' },
  { key: 'graduation_year', label: 'Graduation year', type: 'text', placeholder: 'e.g. 2020', section: 'education' },
  { key: 'major_field', label: 'Major / Field of study', type: 'text', placeholder: 'e.g. Computer Science', section: 'education' },
  { key: 'gpa', label: 'GPA', type: 'text', placeholder: 'e.g. 3.8', section: 'education' },
  { key: 'second_degree', label: 'Second degree', type: 'text', placeholder: 'e.g. Master\'s', section: 'education' },
  { key: 'second_major', label: 'Second major', type: 'text', placeholder: 'e.g. Mathematics', section: 'education' },
  { key: 'how_did_you_hear', label: 'How did you hear about us?', type: 'select', section: 'application', options: [
    { value: '', label: 'Select' },
    { value: 'job_board', label: 'Job board' },
    { value: 'company_site', label: 'Company website' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'referral', label: 'Employee referral' },
    { value: 'other', label: 'Other' },
  ] },
  { key: 'referral_employee_name', label: 'Referral name (if applicable)', type: 'text', placeholder: 'Name of referring employee', section: 'application' },
  { key: 'desired_start_date', label: 'Desired start date', type: 'text', placeholder: 'e.g. Immediately, 2 weeks', section: 'application' },
  { key: 'willing_to_relocate', label: 'Willing to relocate?', type: 'select', section: 'application', options: [
    { value: '', label: 'Select' },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'maybe', label: 'Open to discussion' },
  ] },
  { key: 'willing_to_travel', label: 'Willing to travel?', type: 'select', section: 'application', options: [
    { value: '', label: 'Select' },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'sometimes', label: 'Sometimes' },
  ] },
  { key: 'notice_period', label: 'Notice period', type: 'text', placeholder: 'e.g. 2 weeks', section: 'application' },
  { key: 'cover_letter_note', label: 'Default cover letter note', type: 'textarea', placeholder: 'Short note often asked in applications', section: 'application' },
  { key: 'emergency_contact_name', label: 'Emergency contact name', type: 'text', placeholder: 'Full name', section: 'application' },
  { key: 'emergency_contact_phone', label: 'Emergency contact phone', type: 'tel', placeholder: 'Phone number', section: 'application' },
  { key: 'driver_license_number', label: 'Driver license number', type: 'text', placeholder: 'If required', section: 'application' },
  { key: 'security_clearance', label: 'Security clearance', type: 'select', section: 'application', options: [
    { value: '', label: 'Select' },
    { value: 'none', label: 'None' },
    { value: 'confidential', label: 'Confidential' },
    { value: 'secret', label: 'Secret' },
    { value: 'top_secret', label: 'Top Secret' },
  ] },
  { key: 'ssn_last4', label: 'SSN last 4 digits', type: 'text', placeholder: 'Optional; only if requested', section: 'application' },
]

const SECTIONS: { id: string; title: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'personal', title: 'Personal & contact', icon: User },
  { id: 'address', title: 'Address', icon: MapPin },
  { id: 'professional', title: 'Professional', icon: Briefcase },
  { id: 'eeo', title: 'Work authorization & EEO (voluntary)', icon: Shield },
  { id: 'salary', title: 'Salary', icon: DollarSign },
  { id: 'education', title: 'Education', icon: GraduationCap },
  { id: 'application', title: 'Application preferences', icon: FileText },
]

const SECTION_IDS_LEFT = ['personal', 'address', 'professional']
const SECTION_IDS_RIGHT = ['eeo', 'salary', 'education', 'application']

type CustomPair = { id?: string; field_key: string; field_value: string }

export function AutofillFormFieldsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [data, setData] = useState<AutofillData>({})
  const [excludedFieldKeys, setExcludedFieldKeys] = useState<string[]>([])
  const [fromProfile, setFromProfile] = useState<string[]>([])
  const [customPairs, setCustomPairs] = useState<CustomPair[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      navigate('/', { replace: true })
      return
    }
    const load = async () => {
      try {
        const res = await fetch(apiUrl('/api/autofill'), { headers: { 'x-user-id': user.id } })
        if (!res.ok) {
          setError('Failed to load autofill data')
          return
        }
        const json = await res.json()
        setData(json.data || {})
        setExcludedFieldKeys(Array.isArray(json.excluded_field_keys) ? json.excluded_field_keys : [])
        setFromProfile(Array.isArray(json.from_profile) ? json.from_profile : [])
        setCustomPairs(Array.isArray(json.custom_pairs) ? json.custom_pairs.map((p: { id?: string; field_key?: string; field_value?: string }) => ({ id: p.id, field_key: p.field_key ?? '', field_value: p.field_value ?? '' })) : [])
      } catch {
        setError('Failed to load autofill data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, navigate])

  const handleChange = (key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }))
    setError(null)
    setSaved(false)
  }

  const toggleExcluded = (key: string) => {
    setExcludedFieldKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
    setSaved(false)
  }

  const addCustomPair = () => {
    setCustomPairs((prev) => [...prev, { field_key: '', field_value: '' }])
    setSaved(false)
  }
  const updateCustomPair = (index: number, field: 'field_key' | 'field_value', value: string) => {
    setCustomPairs((prev) => {
      const next = [...prev]
      if (next[index]) next[index] = { ...next[index], [field]: value }
      return next
    })
    setSaved(false)
  }
  const removeCustomPair = (index: number) => {
    setCustomPairs((prev) => prev.filter((_, i) => i !== index))
    setSaved(false)
  }

  const renderField = (f: (typeof FIELD_META)[0], value: string, fromProfileBadge: boolean) => {
    if (f.type === 'textarea') {
      return (
        <div key={f.key}>
          <label htmlFor={f.key} className={labelClass}>
            {f.label}
            {fromProfileBadge && <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">(from profile)</span>}
          </label>
          <textarea
            id={f.key}
            value={value}
            onChange={(e) => handleChange(f.key, e.target.value)}
            placeholder={f.placeholder}
            rows={2}
            className={cn(inputClass, 'min-h-[72px] py-2 resize-y')}
          />
        </div>
      )
    }
    if (f.type === 'select') {
      return (
        <div key={f.key}>
          <label htmlFor={f.key} className={labelClass}>
            {f.label}
            {fromProfileBadge && <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">(from profile)</span>}
          </label>
          <select id={f.key} value={value} onChange={(e) => handleChange(f.key, e.target.value)} className={inputClass}>
            {(f.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )
    }
    if (f.type === 'country') {
      return (
        <div key={f.key}>
          <label htmlFor={f.key} className={labelClass}>
            {f.label}
            {fromProfileBadge && <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">(from profile)</span>}
          </label>
          <select id={f.key} value={value} onChange={(e) => handleChange(f.key, e.target.value)} className={inputClass}>
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
      )
    }
    return (
      <div key={f.key}>
        <label htmlFor={f.key} className={labelClass}>
          {f.label}
          {fromProfileBadge && <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">(from profile)</span>}
        </label>
        <input
          id={f.key}
          type={f.type === 'tel' ? 'tel' : f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : 'text'}
          value={value}
          onChange={(e) => handleChange(f.key, e.target.value)}
          placeholder={f.placeholder}
          className={inputClass}
        />
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/autofill'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          data,
          excluded_field_keys: excludedFieldKeys,
          custom_pairs: customPairs.filter((p) => p.field_key.trim()),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? 'Failed to save')
        return
      }
      setData(json.data || data)
      setExcludedFieldKeys(Array.isArray(json.excluded_field_keys) ? json.excluded_field_keys : excludedFieldKeys)
      setFromProfile(Array.isArray(json.from_profile) ? json.from_profile : [])
      setCustomPairs(Array.isArray(json.custom_pairs) ? json.custom_pairs.map((p: { id?: string; field_key?: string; field_value?: string }) => ({ id: p.id, field_key: p.field_key ?? '', field_value: p.field_value ?? '' })) : customPairs)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      if (settingsOpen) setSettingsOpen(false)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!user?.id) return null
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 w-full overflow-auto">
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Autofill form fields</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Values used to auto-fill job application forms. Max data is pulled from your Profile; you can edit everything here and choose which fields the autofill should skip.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Autofill settings
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
              {error}
            </div>
          )}
          {saved && (
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
              Autofill data saved.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {SECTIONS.filter((s) => SECTION_IDS_LEFT.includes(s.id)).map((sec) => {
                const fields = FIELD_META.filter((f) => f.section === sec.id)
                if (fields.length === 0) return null
                const Icon = sec.icon
                return (
                  <section key={sec.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                    <div className="bg-slate-50/80 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{sec.title}</h2>
                    </div>
                    <div className="p-4 space-y-3">
                      {fields.map((f) => renderField(f, data[f.key] ?? '', fromProfile.includes(f.key)))}
                    </div>
                  </section>
                )
              })}
            </div>
            <div className="space-y-6">
              {SECTIONS.filter((s) => SECTION_IDS_RIGHT.includes(s.id)).map((sec) => {
                const fields = FIELD_META.filter((f) => f.section === sec.id)
                if (fields.length === 0) return null
                const Icon = sec.icon
                return (
                  <section key={sec.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                    <div className="bg-slate-50/80 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{sec.title}</h2>
                    </div>
                    <div className="p-4 space-y-3">
                      {fields.map((f) => renderField(f, data[f.key] ?? '', fromProfile.includes(f.key)))}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <div className="bg-slate-50/80 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Custom key/value pairs</h2>
              </div>
              <button
                type="button"
                onClick={addCustomPair}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                <Plus className="h-3.5 w-3.5" />
                Add pair
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                For site-specific or one-off form fields: add a key (e.g. field name or ID) and the value to fill. Autofill will use these when it finds a matching field.
              </p>
              <div className="space-y-2">
                {customPairs.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-2">No custom pairs. Click &quot;Add pair&quot; to add one.</p>
                ) : (
                  customPairs.map((pair, index) => (
                    <div key={pair.id ?? index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pair.field_key}
                        onChange={(e) => updateCustomPair(index, 'field_key', e.target.value)}
                        placeholder="Key (e.g. custom_question_1)"
                        className={cn(inputClass, 'flex-1 min-w-0')}
                      />
                      <input
                        type="text"
                        value={pair.field_value}
                        onChange={(e) => updateCustomPair(index, 'field_value', e.target.value)}
                        placeholder="Value to fill"
                        className={cn(inputClass, 'flex-1 min-w-0')}
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomPair(index)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3 pb-6">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save all fields'}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Settings className="h-4 w-4" />
              Choose which fields autofill can fill
            </button>
          </div>
        </form>
      </div>

      {/* Settings modal: exclude fields from autofill */}
      {settingsOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSettingsOpen(false)} aria-hidden />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FormInput className="h-5 w-5" />
                Autofill settings
              </h3>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="px-5 py-2 text-sm text-slate-500 dark:text-slate-400">
              Uncheck any field you do <strong>not</strong> want the autofill (e.g. extension) to fill on job application forms. Save to apply.
            </p>
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              <div className="space-y-2">
                {FIELD_META.map((f) => {
                  const excluded = excludedFieldKeys.includes(f.key)
                  return (
                    <label
                      key={f.key}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                        excluded ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={!excluded}
                        onChange={() => toggleExcluded(f.key)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{f.label}</span>
                      {excluded && (
                        <span className="ml-auto text-xs text-amber-700 dark:text-amber-400">Won&apos;t be autofilled</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
