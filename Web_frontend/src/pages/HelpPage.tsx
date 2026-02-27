import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '@/lib/auth'
import {
  HelpCircle,
  Book,
  Mail,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'

const faqs = [
  {
    q: 'How do I generate a resume?',
    a: 'Go to Generate Resume from the sidebar. You can create a job-based resume (paste a job description), use the custom flow, or build from scratch with our Resumake builder. Your content is saved and you can export to PDF.',
  },
  {
    q: 'How do I generate a cover letter?',
    a: 'Open Generate Cover Letter, paste the job description and company name, and we’ll draft a tailored cover letter. You can edit the result and download or copy it.',
  },
  {
    q: 'Where are my documents stored?',
    a: 'All resumes and cover letters appear under Documents. You can view, download PDFs, and manage them from there.',
  },
  {
    q: 'How do I connect an API key?',
    a: 'Go to API Connection in the sidebar. Add your API key for your preferred provider (e.g. OpenAI, Gemini). Keys are stored securely and used only for resume and cover letter generation.',
  },
  {
    q: 'What is the Team 3 extension?',
    a: 'The browser extension lets you use Team 3 tools directly on job sites. Install it from the Extension page (Add extension in the top bar), then use it to generate or tailor content while browsing jobs.',
  },
  {
    q: 'How do I change my profile or settings?',
    a: 'Profile: click your name/avatar at the bottom of the sidebar. Settings: use the Settings page to change language, date format, timezone, notifications, and appearance (including dark mode).',
  },
]

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span>{question}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-3 pt-0">
          <p className="text-sm text-slate-600 dark:text-slate-400">{answer}</p>
        </div>
      )}
    </div>
  )
}

export function HelpPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  useEffect(() => {
    if (!user?.id) navigate('/', { replace: true })
  }, [user?.id, navigate])

  if (!user?.id) return null

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <HelpCircle className="h-7 w-7 text-slate-600 dark:text-slate-400" />
        Help & Support
      </h1>

      <p className="text-slate-600 dark:text-slate-400">
        Find answers to common questions, guides, and how to get in touch with us.
      </p>

      {/* Quick links */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Quick links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="/app/generate-resume"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-slate-300"
          >
            <Book className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium">Generate Resume</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 ml-auto" />
          </a>
          <a
            href="/app/generate-cover-letter"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-slate-300"
          >
            <Book className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium">Generate Cover Letter</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 ml-auto" />
          </a>
          <a
            href="/app/documents"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-slate-300"
          >
            <Book className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium">Documents</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 ml-auto" />
          </a>
          <a
            href="/app/settings"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-slate-300"
          >
            <Book className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium">Settings</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 ml-auto" />
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Frequently asked questions
        </h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <FaqItem
              key={i}
              question={faq.q}
              answer={faq.a}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Contact support
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Can’t find what you need? Reach out and we’ll get back to you as soon as we can.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="mailto:support@team3.example.com"
            className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Mail className="h-4 w-4" />
            support@team3.example.com
          </a>
          <span className="text-slate-400 dark:text-slate-500">|</span>
          <a
            href="#"
            className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <MessageCircle className="h-4 w-4" />
            Live chat (coming soon)
          </a>
        </div>
      </section>

      {/* Resources */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Resources
        </h2>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
              Getting started guide
            </a>
          </li>
          <li>
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
              Resume tips and best practices
            </a>
          </li>
          <li>
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
              API key setup and security
            </a>
          </li>
          <li>
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
              Privacy policy
            </a>
          </li>
          <li>
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
              Terms of service
            </a>
          </li>
        </ul>
      </section>
    </div>
  )
}
