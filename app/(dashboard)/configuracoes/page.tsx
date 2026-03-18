"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { 
  Settings, 
  Moon, 
  Sun, 
  Monitor, 
  Link2, 
  Palette,
  Check
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { IntegrationsSettings } from "@/components/integrations-settings"
import { cn } from "@/lib/utils"

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<"appearance" | "integrations">("appearance")

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie as preferências da plataforma e integrações
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar de Configurações */}
        <aside className="w-full md:w-64 space-y-2">
          <button
            onClick={() => setActiveTab("appearance")}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "appearance" 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Palette className="h-4 w-4" />
            Aparência
          </button>
          <button
            onClick={() => setActiveTab("integrations")}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "integrations" 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Link2 className="h-4 w-4" />
            Integrações
          </button>
        </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1">
          {activeTab === "appearance" && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Tema e Aparência</CardTitle>
                <CardDescription>
                  Personalize o visual do VulnControl
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Tema da Interface</Label>
                  <RadioGroup 
                    value={theme} 
                    onValueChange={(v) => setTheme(v)}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                  >
                    <div>
                      <RadioGroupItem value="light" id="light" className="sr-only" />
                      <Label
                        htmlFor="light"
                        className={cn(
                          "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                          theme === "light" && "border-primary"
                        )}
                      >
                        <Sun className="mb-3 h-6 w-6" />
                        <span className="text-sm font-medium">Claro</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="dark" id="dark" className="sr-only" />
                      <Label
                        htmlFor="dark"
                        className={cn(
                          "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                          theme === "dark" && "border-primary"
                        )}
                      >
                        <Moon className="mb-3 h-6 w-6" />
                        <span className="text-sm font-medium">Escuro</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="system" id="system" className="sr-only" />
                      <Label
                        htmlFor="system"
                        className={cn(
                          "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                          theme === "system" && "border-primary"
                        )}
                      >
                        <Monitor className="mb-3 h-6 w-6" />
                        <span className="text-sm font-medium">Sistema</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Modo de Auto-contraste</Label>
                    <p className="text-sm text-muted-foreground">
                      Otimiza cores para melhor legibilidade
                    </p>
                  </div>
                  <div className="flex h-6 w-10 items-center justify-center rounded-full bg-muted">
                    <Check className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "integrations" && (
            <div className="-mt-1">
              <IntegrationsSettings />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
