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
            <div className="flex min-h-screen bg-background text-foreground relative overflow-hidden">
                {/* Subtle Gradient for depth */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-emerald-500/5 blur-[100px]" />
                    <div className="absolute right-0 bottom-0 h-[30%] w-[30%] rounded-full bg-muted/50 blur-[100px]" />
                </div>

                <AppSidebar />
                <div className="flex-1 ml-64 flex flex-col relative z-10">
                    <AppTopbar />
                    <main className="flex-1 p-8 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    )
}
