import { AppSidebar } from '@/components/app-sidebar'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 ml-64">
                {children}
            </main>
        </div>
    )
}
