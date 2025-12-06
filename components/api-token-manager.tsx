"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { generateApiToken, revokeApiToken, generateTempCode } from "@/app/actions/api-tokens"
import { toast } from "sonner"
import { Copy, RefreshCw, Trash2, Eye, EyeOff, Smartphone } from "lucide-react"

export function ApiTokenManager({ initialToken }: { initialToken: string | null }) {
    const [token, setToken] = useState<string | null>(initialToken)
    const [loading, setLoading] = useState(false)
    const [showToken, setShowToken] = useState(false)
    const [deviceCode, setDeviceCode] = useState<string | null>(null)
    const [loadingCode, setLoadingCode] = useState(false)

    const handleGenerate = async () => {
        setLoading(true)
        try {
            const newToken = await generateApiToken()
            setToken(newToken)
            toast.success("API Token generated")
        } catch (error) {
            toast.error("Failed to generate token")
        } finally {
            setLoading(false)
        }
    }

    const handleRevoke = async () => {
        setLoading(true)
        try {
            await revokeApiToken()
            setToken(null)
            toast.success("Token revoked")
        } catch (error) {
            toast.error("Failed to revoke token")
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateCode = async () => {
        setLoadingCode(true)
        try {
            const code = await generateTempCode()
            setDeviceCode(code)
            toast.success("Device code generated")
        } catch (error) {
            toast.error("Failed to generate code")
        } finally {
            setLoadingCode(false)
        }
    }

    const copyToken = () => {
        if (token) {
            navigator.clipboard.writeText(token)
            toast.success("Token copied")
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>API Token</CardTitle>
                    <CardDescription>Manage your personal access token for the CLI plugin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {token ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <code className="block w-full p-3 bg-muted rounded border font-mono text-sm break-all pr-10">
                                        {showToken ? token : "•".repeat(token.length > 20 ? 20 : token.length)}
                                    </code>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute right-1 top-1 h-7 w-7"
                                        onClick={() => setShowToken(!showToken)}
                                    >
                                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <Button size="icon" variant="outline" onClick={copyToken}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleGenerate} disabled={loading}>
                                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                    Regenerate
                                </Button>
                                <Button variant="destructive" onClick={handleRevoke} disabled={loading}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Revoke
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-muted-foreground mb-4">You don't have an API token yet.</p>
                            <Button onClick={handleGenerate} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                Generate Token
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Device setup</CardTitle>
                    <CardDescription>Generate a temporary 6-digit code to log in on a new device without copying the full token.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!deviceCode ? (
                        <Button onClick={handleGenerateCode} disabled={loadingCode}>
                            <Smartphone className={`h-4 w-4 mr-2 ${loadingCode ? "animate-spin" : ""}`} />
                            Generate Device Code
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-center p-6 border rounded-lg bg-muted/50">
                                <div className="text-4xl font-mono font-bold tracking-widest letter-spacing-2">
                                    {deviceCode.slice(0, 3)} {deviceCode.slice(3)}
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Valid for 5 minutes. Enter this code in your terminal.
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => setDeviceCode(null)} className="w-full">
                                Done
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
