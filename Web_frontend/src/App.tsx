import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignInCard2 } from '@/components/ui/sign-in-card-2'
import { SignUpCard } from '@/components/ui/sign-up-card'
import { WelcomePage } from '@/pages/WelcomePage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { AppLayout } from '@/layouts/AppLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignInCard2 />} />
        <Route path="/signup" element={<SignUpCard />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<WelcomePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
