"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, ArrowRight, Loader2, Shield, ShieldCheck, Activity, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

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
        <div className="flex min-h-screen bg-[#0a0a0f]">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-[#0a0a0f] to-emerald-600/10" />
                    <div className="absolute top-0 left-0 w-full h-full">
                        {/* Grid pattern */}
                        <div className="absolute inset-0 opacity-[0.03]"
                            style={{
                                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                                backgroundSize: '60px 60px'
                            }}
                        />
                    </div>
                    {/* Floating orbs */}
                    <div className="absolute top-[15%] left-[20%] w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute bottom-[20%] right-[15%] w-96 h-96 bg-emerald-500/8 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
                    <div className="absolute top-[50%] left-[50%] w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '4s' }} />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    {/* Top - Logo */}
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <span className="text-xl font-bold text-white tracking-tight">Epic</span>
                            <span className="text-xl font-bold text-emerald-400 tracking-tight">Vuln</span>
                        </div>
                    </div>

                    {/* Center - Hero */}
                    <div className="space-y-8 max-w-lg">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-xs font-medium text-emerald-300">Plataforma ativa e monitorando</span>
                            </div>
                            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
                                Gestão de
                                <br />
                                <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                                    Vulnerabilidades
                                </span>
                                <br />
                                Inteligente
                            </h1>
                            <p className="text-base text-slate-400 leading-relaxed max-w-md">
                                Centralize, priorize e acompanhe a correção de vulnerabilidades com inteligência artificial.
                            </p>
                        </div>

                        {/* Feature pills */}
                        <div className="flex flex-wrap gap-3">
                            {[
                                { icon: ShieldCheck, label: "Risk Score IA", color: "emerald" },
                                { icon: Activity, label: "Métricas DORA", color: "emerald" },
                                { icon: Shield, label: "Multi-tenant", color: "purple" },
                            ].map((feat) => (
                                <div key={feat.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm`}>
                                    <feat.icon className={`h-3.5 w-3.5 text-${feat.color}-400`} />
                                    <span className="text-xs font-medium text-slate-300">{feat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom - Stats */}
                    <div className="flex items-center gap-8">
                        {[
                            { value: "99.9%", label: "Uptime" },
                            { value: "<2s", label: "Análise IA" },
                            { value: "256-bit", label: "Criptografia" },
                        ].map((stat) => (
                            <div key={stat.label} className="space-y-1">
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center relative px-6 lg:px-16">
                {/* Subtle background for right panel */}
                <div className="absolute inset-0 bg-[#0c0c14]" />
                <div className="absolute inset-0 bg-gradient-to-bl from-emerald-600/[0.03] to-transparent" />

                {/* Decorative line separator */}
                <div className="hidden lg:block absolute left-0 top-[10%] bottom-[10%] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

                <div className="relative z-10 w-full max-w-[420px] space-y-8">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <span className="text-xl font-bold text-white tracking-tight">Epic</span>
                            <span className="text-xl font-bold text-emerald-400 tracking-tight">Vuln</span>
                        </div>
                    </div>

                    {/* Welcome text */}
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">Bem-vindo de volta</h2>
                        <p className="text-sm text-slate-500">Insira suas credenciais para acessar a plataforma</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                                E-mail Corporativo
                            </Label>
                            <div className={`relative rounded-xl transition-all duration-300 ${
                                focusedField === 'email'
                                    ? 'ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/5'
                                    : ''
                            }`}>
                                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                                    focusedField === 'email' ? 'text-emerald-400' : 'text-slate-600'
                                }`} />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nome@empresa.com.br"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    className="pl-12 h-13 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus-visible:ring-0 focus-visible:border-emerald-500/30 transition-all rounded-xl text-sm"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                                    Senha
                                </Label>
                                <button type="button" className="text-[11px] text-emerald-400/70 hover:text-emerald-400 transition-colors">
                                    Esqueceu a senha?
                                </button>
                            </div>
                            <div className={`relative rounded-xl transition-all duration-300 ${
                                focusedField === 'password'
                                    ? 'ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/5'
                                    : ''
                            }`}>
                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                                    focusedField === 'password' ? 'text-emerald-400' : 'text-slate-600'
                                }`} />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    className="pl-12 pr-12 h-13 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus-visible:ring-0 focus-visible:border-emerald-500/30 transition-all rounded-xl text-sm"
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

                        {/* Submit */}
                        <Button
                            type="submit"
                            className="w-full h-13 text-sm font-bold rounded-xl transition-all duration-300 active:scale-[0.98] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-xl shadow-emerald-600/20 hover:shadow-emerald-500/30 group"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Autenticando...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    Acessar Plataforma
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </Button>
                    </form>

                    {/* Security badge */}
                    <div className="flex items-center justify-center gap-3 pt-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                            <Lock className="h-3 w-3" />
                            <span className="text-[10px] uppercase tracking-widest">Conexão Segura</span>
                        </div>
                        <div className="h-3 w-px bg-slate-800" />
                        <div className="flex items-center gap-1.5 text-slate-600">
                            <ShieldCheck className="h-3 w-3" />
                            <span className="text-[10px] uppercase tracking-widest">TLS 1.3</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-[11px] text-slate-700">
                        EpicVuln v2.0 &mdash; Plataforma de Gestão de Vulnerabilidades
                    </p>
                </div>
            </div>
        </div>
    )
}
