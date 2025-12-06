"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createCommand } from "@/app/actions/commands"
import { updateCommand } from "@/app/actions/edit-command"
import { toast } from "sonner"
import { Check, ChevronsUpDown, Globe, Lock, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TagInput } from "@/components/tag-input"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

import { PLATFORMS } from "@/lib/constants"

interface CreateCommandFormProps {
    initialData?: {
        id: string
        title: string | null
        text: string
        description: string | null
        platform: string
        visibility: string
        tags: { tag: { name: string } }[]
    }
    onCancel: () => void
    onSuccess: () => void
    onSearch: (query: string) => void
}

export function CreateCommandForm({ initialData, onCancel, onSuccess, onSearch }: CreateCommandFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [platformOpen, setPlatformOpen] = useState(false)

    // Initialize state from initialData if available
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
        initialData?.platform ? initialData.platform.split(",").filter(Boolean) : []
    )
    const [tags, setTags] = useState<string[]>(
        initialData?.tags ? initialData.tags.map(t => t.tag.name) : []
    )
    const [isPublic, setIsPublic] = useState(initialData?.visibility === "PUBLIC")
    const [text, setText] = useState(initialData?.text || "")

    const formRef = useRef<HTMLFormElement>(null)
    const platformButtonRef = useRef<HTMLButtonElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
        }
    }, [text])

    useEffect(() => {
        // Load last selected platforms if creating new
        if (!initialData) {
            const saved = localStorage.getItem("lastSelectedPlatforms")
            if (saved) {
                try {
                    setSelectedPlatforms(JSON.parse(saved))
                } catch (e) {
                    // Ignore error
                }
            }
        }

        // Check for prefill from sessionStorage (for Promote feature)
        const prefill = sessionStorage.getItem("cmvault-prefill")
        if (prefill) {
            setText(prefill)
            sessionStorage.removeItem("cmvault-prefill")
            onSearch(prefill) // Filter list based on prefill
        }
    }, [initialData, onSearch])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        try {
            const data = {
                title: formData.get("title") as string,
                text: text, // Use state for text
                description: "",
                platform: selectedPlatforms.join(","),
                visibility: (isPublic ? "PUBLIC" : "PRIVATE") as "PUBLIC" | "PRIVATE",
                tags: tags
            }

            if (initialData) {
                await updateCommand(initialData.id, data)
                toast.success("Command updated")
            } else {
                await createCommand(data)
                toast.success("Command created")
            }
            onSuccess()
            router.refresh()
        } catch (error) {
            toast.error(initialData ? "Failed to update command" : "Failed to create command")
        } finally {
            setLoading(false)
        }
    }

    const handleFormKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault()
            formRef.current?.requestSubmit()
        }
    }

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            platformButtonRef.current?.focus()
        }
    }

    const togglePlatform = (value: string) => {
        setSelectedPlatforms(prev => {
            const newPlatforms = prev.includes(value)
                ? prev.filter(p => p !== value)
                : [...prev, value]
            if (!initialData) {
                localStorage.setItem("lastSelectedPlatforms", JSON.stringify(newPlatforms))
            }
            return newPlatforms
        })
    }

    return (
        <Card className="border-2 border-primary/20 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
                <CardTitle className="text-lg font-medium">
                    {initialData ? "Edit Command" : "Add New Command"}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onCancel}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="px-4">
                <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    onKeyDown={handleFormKeyDown}
                    className="grid gap-4"
                >
                    <div className="flex flex-col md:flex-row gap-4 -mt-4">
                        <div className="flex-1 min-w-[200px]">
                            <Input
                                id="title"
                                name="title"
                                placeholder="Command Title (e.g. List files)"
                                defaultValue={initialData?.title || ""}
                                autoFocus
                                onKeyDown={handleTitleKeyDown}
                                className="h-10"
                            />
                        </div>
                        <div className="w-full md:w-[200px]">
                            <Popover open={platformOpen} onOpenChange={setPlatformOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        ref={platformButtonRef}
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={platformOpen}
                                        className="w-full justify-between px-3 text-muted-foreground h-10"
                                    >
                                        {selectedPlatforms.length > 0
                                            ? <div className="flex gap-1 overflow-hidden text-foreground">
                                                {PLATFORMS.slice(0, 1).map(p => (
                                                    <Badge key={p.value} variant="secondary" className="px-1 py-0 text-[10px] h-5">{p.label}</Badge>
                                                ))}
                                                {selectedPlatforms.length > 1 && <span className="text-xs text-muted-foreground">+{selectedPlatforms.length - 1}</span>}
                                            </div>
                                            : <span>Select Platform</span>}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[200px]" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search platform..." className="h-9" />
                                        <CommandList>
                                            <CommandEmpty>No platform found.</CommandEmpty>
                                            <CommandGroup>
                                                {PLATFORMS.map((framework) => (
                                                    <CommandItem
                                                        key={framework.value}
                                                        value={framework.value}
                                                        onSelect={() => togglePlatform(framework.value)}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedPlatforms.includes(framework.value) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {framework.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <TagInput
                                tags={tags}
                                setTags={setTags}
                                placeholder="Tags (git, docker...)"
                                className="h-10"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Textarea
                            ref={textareaRef}
                            id="text"
                            name="text"
                            className="font-mono text-sm resize-none overflow-hidden min-h-[40px]"
                            required
                            rows={1}
                            placeholder="Command (e.g. ls -la)"
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value)
                                onSearch(e.target.value)
                                // Auto-resize
                                e.target.style.height = 'auto'
                                e.target.style.height = e.target.scrollHeight + 'px'
                            }}
                        />
                    </div>

                    <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4 pt-2">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 md:flex-none">Cancel</Button>
                            <Button type="submit" disabled={loading} className="flex-1 md:flex-none">
                                {initialData ? "Update Command" : "Create Command"}
                            </Button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="visibility"
                                checked={isPublic}
                                onCheckedChange={setIsPublic}
                            />
                            <Label htmlFor="visibility" className="flex items-center gap-1 cursor-pointer min-w-[60px]">
                                {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                {isPublic ? "Public" : "Private"}
                            </Label>
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
