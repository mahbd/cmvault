"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Trash2 } from "lucide-react"
import { deleteCommand } from "@/app/actions/commands"
import { toast } from "sonner"
import { EditCommandDialog } from "@/components/edit-command-dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

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
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[300px]">Command</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Tags</TableHead>
                        {!readOnly && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {commands.map((command) => (
                        <TableRow
                            key={command.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleCopy(command.text)}
                        >
                            <TableCell className="font-mono text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="truncate max-w-[250px]" title={command.text}>
                                        {command.text}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleCopy(command.text)
                                        }}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{command.title || "-"}</span>
                                    {command.description && (
                                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                            {command.description}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                    {command.platform.split(",").filter(Boolean).map(p => (
                                        <Badge key={p} variant="outline" className="text-[10px] px-1 py-0 h-5">
                                            {p}
                                        </Badge>
                                    ))}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                    {command.tags.map(({ tag }) => (
                                        <Badge key={tag.name} variant="secondary" className="text-[10px] px-1 py-0 h-5">
                                            {tag.name}
                                        </Badge>
                                    ))}
                                </div>
                            </TableCell>
                            {!readOnly && (
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                        <EditCommandDialog command={command} />
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(command.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
