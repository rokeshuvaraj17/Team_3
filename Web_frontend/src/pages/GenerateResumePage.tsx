import { Link } from 'react-router-dom'
import { FileOutput, Briefcase, User } from 'lucide-react'

export function GenerateResumePage() {
  return (
    <div className="w-full max-w-none py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Generate Resume</h1>
        <p className="text-slate-600 mt-0.5">Choose how you want to create your resume.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <Link
          to="/app/generate-resume/job-based"
          className="group relative flex flex-col p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Briefcase className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Job based</h2>
            <p className="text-sm text-slate-600 mt-1.5">
              Generate a resume tailored to a specific job. Pick a job from your search or saved list and we’ll highlight relevant experience and skills.
            </p>
          </div>
        </Link>
        <Link
          to="/app/generate-resume/custom"
          className="group relative flex flex-col p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <User className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Custom resume</h2>
            <p className="text-sm text-slate-600 mt-1.5">
              Build a resume from scratch with a step-by-step form. Add your details, education, experience, and skills.
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
