"use client"

import { useState, useEffect, useRef } from "react"
import { CommandList } from "@/components/command-list"
import { CreateCommandForm } from "@/components/create-command-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, LogIn } from "lucide-react"
import Link from "next/link"

interface DashboardClientProps {
    initialCommands: any[]
    session: any
    initialQuery?: string
}

export function DashboardClient({ initialCommands, session, initialQuery = "" }: DashboardClientProps) {
    const [query, setQuery] = useState(initialQuery)
    const [isAdding, setIsAdding] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

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
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [session])

    // We use initialCommands as the source of truth for now. 
    // In a real app with server actions revalidating path, the prop would update.
    // But since we are doing client-side filtering, this is fine.

    const filteredCommands = initialCommands.filter((cmd) =>
        cmd.text.toLowerCase().includes(query.toLowerCase()) ||
        cmd.title?.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(query.toLowerCase()) ||
        cmd.tags.some((t: any) => t.tag.name.toLowerCase().includes(query.toLowerCase()))
    )

    const handleSearch = (newQuery: string) => {
        setQuery(newQuery)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <div className="flex-1 max-w-sm relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        ref={searchInputRef}
                        placeholder="Search commands... (Press '/')"
                        className="pl-8"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {session ? (
                        !isAdding && (
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

            {isAdding && (
                <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-300">
                    <CreateCommandForm
                        onCancel={() => {
                            setIsAdding(false)
                            setQuery("") // Reset query on cancel? Maybe user wants to keep it. Let's reset for now.
                        }}
                        onSuccess={() => {
                            setIsAdding(false)
                            setQuery("")
                        }}
                        onSearch={handleSearch}
                    />
                </div>
            )}

            <CommandList commands={filteredCommands} readOnly={!session} />
        </div>
    )
}
