"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Trash2 } from "lucide-react"
import { deleteCommand } from "@/app/actions/commands"
import { toast } from "sonner"
import { EditCommandDialog } from "@/components/edit-command-dialog"

interface Command {
    id: string
    title: string | null
    text: string
    description: string | null
    platform: string
    visibility: string
    tags: { tag: { name: string } }[]
}

export function CommandList({ commands, readOnly = false }: { commands: Command[], readOnly?: boolean }) {
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success("Copied to clipboard")
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteCommand(id)
            toast.success("Command deleted")
        } catch (error) {
            toast.error("Failed to delete command")
        }
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {commands.map((command) => (
                <Card key={command.id}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <div className="grid gap-1">
                            <CardTitle className="text-base font-medium">
                                {command.title || command.text.slice(0, 20)}
                            </CardTitle>
                            <CardDescription className="flex gap-1 flex-wrap">
                                {command.platform.split(",").filter(Boolean).map(p => (
                                    <Badge key={p} variant="outline" className="text-[10px] px-1 py-0 h-5">
                                        {p}
                                    </Badge>
                                ))}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleCopy(command.text)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                            {!readOnly && (
                                <>
                                    <EditCommandDialog command={command} />
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(command.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2">
                            <div className="rounded-md bg-muted p-2 font-mono text-sm">
                                {command.text}
                            </div>
                            {command.description && (
                                <p className="text-sm text-muted-foreground">
                                    {command.description}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-1">
                                {command.tags.map(({ tag }) => (
                                    <Badge key={tag.name} variant="secondary">
                                        {tag.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
