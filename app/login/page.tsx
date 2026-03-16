"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, ShieldAlert, ArrowRight, Loader2 } from "lucide-react"
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
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001'
            const res = await fetch(`${API_URL}/api/auth/login`, {
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
        <div className="flex min-h-screen items-center justify-center bg-black">
            {/* Background gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-red-900/20 blur-[120px]" />
                <div className="absolute -right-1/4 -bottom-1/4 h-1/2 w-1/2 rounded-full bg-red-900/10 blur-[120px]" />
            </div>

            <div className="z-10 w-full max-w-md p-8">
                <div className="mb-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]">
                        <ShieldAlert size={32} />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">VulnControl</h1>
                    <p className="text-sm text-zinc-400">
                        Acesso Restrito: Equipe de Segurança & Pentest
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 bg-zinc-950/50 p-8 rounded-2xl border border-zinc-900 backdrop-blur-xl">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-zinc-400">E-mail Corporativo</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nome@credsystem.com.br"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-red-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-zinc-400">Senha</Label>
                                <a href="#" className="text-xs text-red-500 hover:text-red-400">
                                    Esqueceu a senha?
                                </a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-red-500"
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-red-600 hover:bg-red-700 text-white h-11"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                Entrar Seguramente
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>

                    <div className="mt-6 text-center text-xs text-zinc-600">
                        O acesso não autorizado é estritamente proibido e monitorado.
                    </div>
                </form>
            </div>
        </div>
    )
}
