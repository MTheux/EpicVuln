import { AppSidebar } from '@/components/app-sidebar'
import { AppTopbar } from '@/components/app-topbar'
import { AuthGuard } from '@/components/auth-guard'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard>
            <div className="flex min-h-screen bg-background text-foreground relative ambient-orbs grid-bg">
                <AppSidebar />
                <div className="flex-1 ml-14 flex flex-col relative z-10">
                    <AppTopbar />
                    <main className="flex-1 p-8 overflow-y-auto fade-in-up">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    )
}
