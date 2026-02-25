import { Link } from 'react-router-dom'
import { Briefcase, ArrowLeft } from 'lucide-react'

export function JobBasedResumePage() {
  return (
    <div className="w-full max-w-none py-8 px-4">
      <Link
        to="/app/generate-resume"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Generate Resume
      </Link>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <Briefcase className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Job-based resume</h1>
        <p className="text-slate-600 mt-1.5">
          Select a job from your dashboard or saved list to generate a tailored resume. You can start from the job search and use “Generate resume” on a job to use this feature.
        </p>
        <Link
          to="/app"
          className="inline-flex items-center gap-2 mt-5 px-5 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700"
        >
          Go to job search
        </Link>
      </div>
    </div>
  )
}
