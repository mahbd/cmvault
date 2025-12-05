"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createCommand } from "@/app/actions/commands"
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

const platforms = [
    { value: "linux", label: "Linux" },
    { value: "macos", label: "macOS" },
    { value: "windows", label: "Windows" },
    { value: "android", label: "Android" },
    { value: "ios", label: "iOS" },
    { value: "debian", label: "Debian" },
    { value: "arch", label: "Arch" },
    { value: "fedora", label: "Fedora" },
    { value: "alpine", label: "Alpine" },
    { value: "others", label: "Others" },
]

interface CreateCommandFormProps {
    onCancel: () => void
    onSuccess: () => void
    onSearch: (query: string) => void
    initialText?: string
}

export function CreateCommandForm({ onCancel, onSuccess, onSearch, initialText }: CreateCommandFormProps) {
    const [loading, setLoading] = useState(false)
    const [platformOpen, setPlatformOpen] = useState(false)
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
    const [tags, setTags] = useState<string[]>([])
    const [isPublic, setIsPublic] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)
    const platformButtonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        const saved = localStorage.getItem("lastSelectedPlatforms")
        if (saved) {
            try {
                setSelectedPlatforms(JSON.parse(saved))
            } catch (e) {
                // Ignore error
            }
        }
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onCancel()
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [onCancel])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        try {
            await createCommand({
                title: formData.get("title") as string,
                text: formData.get("text") as string,
                description: formData.get("description") as string,
                platform: selectedPlatforms.join(","),
                visibility: isPublic ? "PUBLIC" : "PRIVATE",
                tags: tags
            })
            toast.success("Command created")
            onSuccess()
        } catch (error) {
            toast.error("Failed to create command")
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

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onSearch(e.target.value)
    }

    const togglePlatform = (value: string) => {
        setSelectedPlatforms(prev => {
            const newPlatforms = prev.includes(value)
                ? prev.filter(p => p !== value)
                : [...prev, value]
            localStorage.setItem("lastSelectedPlatforms", JSON.stringify(newPlatforms))
            return newPlatforms
        })
    }

    return (
        <Card className="border-2 border-primary/20 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-0">
                <CardTitle className="text-sm font-medium">Add New Command</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
                    <X className="h-3 w-3" />
                </Button>
            </CardHeader>
            <CardContent className="p-3">
                <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    onKeyDown={handleFormKeyDown}
                    className="grid gap-3"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Input
                                id="title"
                                name="title"
                                placeholder="Title (e.g. List files)"
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={handleTitleKeyDown}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Popover open={platformOpen} onOpenChange={setPlatformOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        ref={platformButtonRef}
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={platformOpen}
                                        className="justify-between h-8 text-sm px-2 text-muted-foreground"
                                    >
                                        {selectedPlatforms.length > 0
                                            ? <div className="flex gap-1 overflow-hidden text-foreground">
                                                {selectedPlatforms.slice(0, 2).map(p => (
                                                    <Badge key={p} variant="secondary" className="px-1 py-0 text-[10px] h-5">{platforms.find(pl => pl.value === p)?.label}</Badge>
                                                ))}
                                                {selectedPlatforms.length > 2 && <span className="text-xs text-muted-foreground">+{selectedPlatforms.length - 2}</span>}
                                            </div>
                                            : <span>Select platforms...</span>}
                                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[200px]" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search platform..." className="h-8 text-xs" />
                                        <CommandList>
                                            <CommandEmpty>No platform found.</CommandEmpty>
                                            <CommandGroup>
                                                {platforms.map((framework) => (
                                                    <CommandItem
                                                        key={framework.value}
                                                        value={framework.value}
                                                        onSelect={() => togglePlatform(framework.value)}
                                                        className="text-xs"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-3 w-3",
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
                    </div>

                    <div className="grid gap-1.5">
                        <Textarea
                            id="text"
                            name="text"
                            className="font-mono min-h-[60px] text-sm py-2"
                            required
                            placeholder="Command (e.g. ls -la)"
                            onChange={handleTextChange}
                            defaultValue={initialText}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Input id="description" name="description" placeholder="Description (optional)" className="h-8 text-sm" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                        <div className="grid gap-1.5">
                            <TagInput
                                tags={tags}
                                setTags={setTags}
                                placeholder="Tags (git, docker...)"
                            />
                            <input type="hidden" name="tags" value={tags.join(",")} />
                        </div>
                        <div className="flex items-center justify-end space-x-2 h-8">
                            <Switch
                                id="visibility"
                                checked={isPublic}
                                onCheckedChange={setIsPublic}
                                className="scale-75 origin-right"
                            />
                            <Label htmlFor="visibility" className="flex items-center gap-1 cursor-pointer text-xs min-w-[60px]">
                                {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                {isPublic ? "Public" : "Private"}
                            </Label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-7 text-xs">Cancel</Button>
                        <Button type="submit" size="sm" disabled={loading} className="h-7 text-xs">Save</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
