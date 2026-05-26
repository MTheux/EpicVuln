"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { UnisysLogo } from "@/components/unisys-logo"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [focusedField, setFocusedField] = useState<string | null>(null)

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
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Credenciais inválidas')

            localStorage.setItem('epicvuln_user', JSON.stringify(data.user))

            toast.success("Bem-vindo", { description: data.user.name })
            router.push("/")
            router.refresh()
        } catch (err: any) {
            toast.error("Acesso negado", { description: err.message })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen bg-[#0a0d0a] relative overflow-hidden">
            {/* Ambient mesh gradient — sutil, estilo unisys.com */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 h-[700px] w-[700px] rounded-full bg-emerald-500/[0.08] blur-[120px]" />
                <div className="absolute top-1/3 -right-1/4 h-[600px] w-[600px] rounded-full bg-emerald-600/[0.06] blur-[140px]" />
                <div className="absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full bg-teal-500/[0.04] blur-[100px]" />
                {/* Subtle grid */}
                <div
                    className="absolute inset-0 opacity-[0.025]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                        backgroundSize: "80px 80px",
                    }}
                />
            </div>

            {/* Left — brand */}
            <div className="hidden lg:flex lg:w-[58%] relative z-10 flex-col justify-between p-16">
                {/* Top brand */}
                <div className="flex items-center gap-3">
                    <UnisysLogo size={48} variant="wordmark" tone="color" />
                </div>

                {/* Hero center */}
                <div className="space-y-8 max-w-xl">
                    <div className="space-y-6">
                        <h1 className="text-6xl xl:text-7xl font-extrabold leading-[1.05] tracking-tight">
                            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 bg-clip-text text-transparent">AI</span>
                            <span className="text-white">SEC</span>
                            <span className="block text-3xl xl:text-4xl text-slate-400 font-light mt-3">
                                AppSec &amp; ASPM Platform
                            </span>
                        </h1>
                        <p className="text-xl text-slate-400 leading-relaxed font-light max-w-lg">
                            Gestão de vulnerabilidades, threat modeling, skills agênticas de pentest e remediação assistida por IA.
                        </p>
                    </div>
                </div>

                {/* Bottom — subtle copyright only */}
                <p className="text-xs text-slate-700 font-medium">
                    © {new Date().getFullYear()} Unisys Corporation
                </p>
            </div>

            {/* Right — form */}
            <div className="flex-1 flex items-center justify-center relative z-10 px-6 lg:px-16">
                {/* Soft separator on lg+ */}
                <div className="hidden lg:block absolute left-0 top-[15%] bottom-[15%] w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />

                <div className="relative w-full max-w-[400px] space-y-10">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center justify-center">
                        <UnisysLogo size={44} variant="wordmark" tone="color" />
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold text-white tracking-tight">Acesse sua conta</h2>
                        <p className="text-sm text-slate-500 font-normal">
                            Entre com suas credenciais corporativas Unisys/Caixa.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em]">
                                E-mail
                            </Label>
                            <div
                                className={`relative rounded-2xl transition-all duration-300 ${
                                    focusedField === "email" ? "ring-2 ring-emerald-500/40" : ""
                                }`}
                            >
                                <Mail
                                    className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                                        focusedField === "email" ? "text-emerald-400" : "text-slate-600"
                                    }`}
                                />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nome@unisys.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField("email")}
                                    onBlur={() => setFocusedField(null)}
                                    className="pl-12 h-14 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-slate-700 focus-visible:ring-0 focus-visible:border-emerald-500/40 transition-all rounded-2xl text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em]">
                                    Senha
                                </Label>
                                <button type="button" className="text-[11px] text-emerald-400/70 hover:text-emerald-400 transition-colors font-medium">
                                    Esqueceu?
                                </button>
                            </div>
                            <div
                                className={`relative rounded-2xl transition-all duration-300 ${
                                    focusedField === "password" ? "ring-2 ring-emerald-500/40" : ""
                                }`}
                            >
                                <Lock
                                    className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                                        focusedField === "password" ? "text-emerald-400" : "text-slate-600"
                                    }`}
                                />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField("password")}
                                    onBlur={() => setFocusedField(null)}
                                    className="pl-12 pr-12 h-14 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-slate-700 focus-visible:ring-0 focus-visible:border-emerald-500/40 transition-all rounded-2xl text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-14 text-sm font-bold rounded-2xl transition-all duration-300 active:scale-[0.98] bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30 group mt-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Autenticando</span>
                                </div>
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
        </div>
    )
}
