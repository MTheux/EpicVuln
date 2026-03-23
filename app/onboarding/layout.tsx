import { AuthGuard } from '@/components/auth-guard'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    </AuthGuard>
  )
}
