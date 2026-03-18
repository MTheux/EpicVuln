"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const getDynamicApiUrl = () => {
                if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
                if (typeof window !== 'undefined') {
                    return `http://${window.location.hostname}:9001`
                }
                return 'http://localhost:9001'
            }
            const CURRENT_API = getDynamicApiUrl()
            const res = await fetch(`${CURRENT_API}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Credenciais inválidas')

            document.cookie = `vulncontrol_token=${data.token}; path=/; max-age=86400; SameSite=Lax`
            localStorage.setItem('vulncontrol_user', JSON.stringify(data.user))

            toast.success("Login aprovado", {
                description: `Bem-vindo, ${data.user.name}`
            })
            router.push("/")
            router.refresh()
        } catch (err: any) {
            toast.error("Acesso Negado", {
                description: err.message || "E-mail ou senha incorretos."
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 overflow-hidden relative">
            {/* Soft Ambient Glows - Light version */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-blue-500/5 blur-[120px] animate-pulse duration-[10s]" />
                <div className="absolute -right-[15%] -bottom-[15%] h-[60%] w-[60%] rounded-full bg-slate-200/50 blur-[150px] animate-pulse duration-[15s] delay-700" />
            </div>

            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent)] opacity-[0.5] pointer-events-none" />

            <div className="z-10 w-full max-w-md p-8">
                <div className="mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
                </div>

                <form onSubmit={handleLogin} className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-blue-900/5 animate-in zoom-in-95 duration-700">
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1 opacity-70">E-mail Corporativo</Label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nome@credsystem.com.br"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-12 h-14 bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:bg-white transition-all rounded-2xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <Label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-widest opacity-70">Senha</Label>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-12 h-14 bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500/20 focus-visible:bg-white transition-all rounded-2xl"
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white h-14 text-base font-bold rounded-2xl shadow-lg shadow-blue-600/20 group transition-all duration-300 active:scale-95"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                Entrar
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    )
}
