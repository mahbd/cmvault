"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, ArrowUpRight, Terminal } from "lucide-react"
import { deleteLearnedCommand } from "@/app/actions/learned"
import { toast } from "sonner"
import { CreateCommandForm } from "@/components/create-command-form"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"

// Helper to parse context
const getContextDirs = (contextStr: string | null) => {
    if (!contextStr) return []
    try {
        const context = JSON.parse(contextStr)
        // Sort by count desc if available, or just return
        return context
            .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
            .map((c: any) => c.directory)
            .filter(Boolean)
            .slice(0, 10) // Limit to top 5 directories
    } catch (e) {
        return []
    }
}

interface LearnedClientProps {
    initialCommands: any[]
    session: any
}

export function LearnedClient({ initialCommands, session }: LearnedClientProps) {
    const [commands, setCommands] = useState(initialCommands)
    const [promotingCommand, setPromotingCommand] = useState<any | null>(null)

    const handleDelete = async (id: string) => {
        try {
            await deleteLearnedCommand(id)
            setCommands(commands.filter(c => c.id !== id))
            toast.success("Command removed")
        } catch (error) {
            toast.error("Failed to remove command")
        }
    }

    const handlePromoteSuccess = async (commandId: string) => {
        // After successful promotion, delete the learned entry
        if (promotingCommand) {
            setPromotingCommand(null)
            toast.success("Command promoted and removed from learned list")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Learned Commands</h1>
                <p className="text-muted-foreground">
                    Commands captured from your terminal usage.
                </p>
            </div>

            {promotingCommand && (
                <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Promote Command</h2>
                        <Button variant="ghost" size="sm" onClick={() => setPromotingCommand(null)}>
                            Cancel
                        </Button>
                    </div>
                    <CreateCommandForm
                        initialText={promotingCommand.command}
                        onCancel={() => setPromotingCommand(null)}
                        onSuccess={() => handlePromoteSuccess(promotingCommand.id)}
                        onSearch={() => { }}
                    />
                </div>
            )}

            <div className="grid gap-4">
                {commands.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No learned commands yet. Use your terminal!
                    </div>
                ) : (
                    commands.map((cmd) => (
                        <Card key={cmd.id} className="group hover:shadow-md transition-all">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex-1 min-w-0 mr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Terminal className="h-4 w-4 text-muted-foreground" />
                                        <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                                            {cmd.command}
                                        </code>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                                        <span>{cmd.os || "Unknown OS"}</span>
                                        <span>•</span>
                                        <span>Last used {formatDistanceToNow(new Date(cmd.updatedAt), { addSuffix: true })}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {getContextDirs(cmd.context).map((dir: string, i: number) => (
                                            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0.5 font-mono font-normal text-muted-foreground bg-muted/50 hover:bg-muted">
                                                {dir}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPromotingCommand(cmd)}
                                    >
                                        <ArrowUpRight className="h-4 w-4 mr-2" />
                                        Promote
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(cmd.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
