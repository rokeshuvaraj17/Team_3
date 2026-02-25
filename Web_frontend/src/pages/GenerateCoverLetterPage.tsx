import { PenLine } from 'lucide-react'

export function GenerateCoverLetterPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mx-auto mb-6">
        <PenLine className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Generate Cover Letter</h1>
      <p className="text-slate-600 mt-2">
        Tailor a cover letter to any job. This feature is coming soon.
      </p>
    </div>
  )
}
