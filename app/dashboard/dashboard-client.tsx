"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { CommandList } from "@/components/command-list"
import { CreateCommandForm } from "@/components/create-command-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, LogIn, Filter } from "lucide-react"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { PLATFORMS } from "@/lib/constants"

interface DashboardClientProps {
    initialCommands: any[]
    session: any
    initialQuery?: string
}

export function DashboardClient({ initialCommands, session, initialQuery = "" }: DashboardClientProps) {
    const [query, setQuery] = useState(initialQuery)
    const [isAdding, setIsAdding] = useState(false)
    const [editingCommand, setEditingCommand] = useState<any | null>(null)
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        // Check for prefill from promote
        const prefill = sessionStorage.getItem("cmvault-prefill")
        if (prefill) {
            setIsAdding(true)
            // The form will handle the actual prefill reading
        }
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (["INPUT", "TEXTAREA"].includes(target.tagName)) return

            if (e.key === "/") {
                e.preventDefault()
                searchInputRef.current?.focus()
            } else if (e.key === "+" && session) {
                e.preventDefault()
                setIsAdding(true)
                setEditingCommand(null)
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [session])



    const filteredCommands = initialCommands.filter((cmd) => {
        const matchesQuery = cmd.text.toLowerCase().includes(query.toLowerCase()) ||
            cmd.title?.toLowerCase().includes(query.toLowerCase()) ||
            cmd.description?.toLowerCase().includes(query.toLowerCase()) ||
            cmd.tags.some((t: any) => t.tag.name.toLowerCase().includes(query.toLowerCase()))

        const matchesPlatform = selectedPlatform ? cmd.platform.split(",").includes(selectedPlatform) : true

        return matchesQuery && matchesPlatform
    })

    const handleSearch = (newQuery: string) => {
        setQuery(newQuery)
    }

    const handleEdit = (cmd: any) => {
        setEditingCommand(cmd)
        setIsAdding(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const closeForm = () => {
        setIsAdding(false)
        setEditingCommand(null)
        setQuery("")
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <div className="flex-1 max-w-sm relative flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Search commands... (Press '/')"
                            className="pl-8"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size={selectedPlatform ? "default" : "icon"}
                                className={selectedPlatform ? "bg-accent text-accent-foreground gap-2 px-3" : ""}
                            >
                                <Filter className="h-4 w-4" />
                                {selectedPlatform && (
                                    <span>{PLATFORMS.find(p => p.value === selectedPlatform)?.label}</span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Filter by Platform</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={selectedPlatform === null}
                                onCheckedChange={() => setSelectedPlatform(null)}
                            >
                                All Platforms
                            </DropdownMenuCheckboxItem>
                            {PLATFORMS.map(platform => (
                                <DropdownMenuCheckboxItem
                                    key={platform.value}
                                    checked={selectedPlatform === platform.value}
                                    onCheckedChange={() => setSelectedPlatform(platform.value)}
                                >
                                    {platform.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex gap-2">
                    {session ? (
                        (!isAdding && !editingCommand) && (
                            <Button onClick={() => setIsAdding(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Command
                            </Button>
                        )
                    ) : (
                        <Button asChild>
                            <Link href="/sign-in">
                                <LogIn className="mr-2 h-4 w-4" />
                                Sign In
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {(isAdding || editingCommand) && (
                <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-300">
                    <CreateCommandForm
                        initialData={editingCommand}
                        onCancel={closeForm}
                        onSuccess={closeForm}
                        onSearch={handleSearch}
                    />
                </div>
            )}

            <CommandList
                commands={filteredCommands}
                readOnly={!session}
                onEdit={handleEdit}
            />
        </div>
    )
}
