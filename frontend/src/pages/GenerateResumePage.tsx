import { Link } from 'react-router-dom'
import { Briefcase, LayoutTemplate } from 'lucide-react'

export function GenerateResumePage() {
  return (
    <div className="w-full max-w-5xl py-6 px-4 mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Generate Resume</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-0.5">
          Choose how you want to create your resume.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <Link
          to="/app/generate-resume/job-based"
          className="group relative flex flex-col p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-400 transition-all duration-200 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Briefcase className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Job based</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              Generate a resume tailored to a specific job. Pick a job from your search or saved list and we’ll highlight
              relevant experience and skills.
            </p>
          </div>
        </Link>
        <Link
          to="/app/generate-resume/builder"
          className="group relative flex flex-col p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-400 transition-all duration-200 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <LayoutTemplate className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Resume Builder (templates)</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              Resumake-style: choose a LaTeX template, fill in profile, education, work, skills, projects, and awards. Export
              as .tex or JSON.
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
