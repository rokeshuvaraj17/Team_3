import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignInCard2 } from '@/components/ui/sign-in-card-2'
import { SignUpCard } from '@/components/ui/sign-up-card'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { AuthorizeExtensionPage } from '@/pages/AuthorizeExtensionPage'
import { WelcomePage } from '@/pages/WelcomePage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { GenerateResumePage } from '@/pages/GenerateResumePage'
import { GenerateCoverLetterPage } from '@/pages/GenerateCoverLetterPage'
import { JobBasedResumePage } from '@/pages/JobBasedResumePage'
import { CustomResumePage } from '@/pages/CustomResumePage'
import { ResumakeBuilderPage } from '@/pages/ResumakeBuilderPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { ApiConnectionPage } from '@/pages/ApiConnectionPage'
import { AutofillFormFieldsPage } from '@/pages/AutofillFormFieldsPage'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { JobTrackerPage } from '@/pages/JobTrackerPage'
import { ExtensionPage } from '@/pages/ExtensionPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { HelpPage } from '@/pages/HelpPage'
import { AppLayout } from '@/layouts/AppLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignInCard2 />} />
        <Route path="/signup" element={<SignUpCard />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/oauth/extension" element={<AuthorizeExtensionPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<WelcomePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="generate-resume" element={<GenerateResumePage />} />
          <Route path="generate-resume/job-based" element={<JobBasedResumePage />} />
          <Route path="generate-resume/custom" element={<CustomResumePage />} />
          <Route path="generate-resume/builder" element={<ResumakeBuilderPage />} />
          <Route path="generate-cover-letter" element={<GenerateCoverLetterPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="job-tracker" element={<JobTrackerPage />} />
          <Route path="extension" element={<ExtensionPage />} />
          <Route path="api-connection" element={<ApiConnectionPage />} />
          <Route path="autofill-form-fields" element={<AutofillFormFieldsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
