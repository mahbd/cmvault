
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createCommand } from "@/app/actions/commands"
import { toast } from "sonner"
import { Plus, Check, ChevronsUpDown, Globe, Lock } from "lucide-react"
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

export function CreateCommandDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [platformOpen, setPlatformOpen] = useState(false)
    const [platform, setPlatform] = useState("")
    const [isPublic, setIsPublic] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        try {
            await createCommand({
                title: formData.get("title") as string,
                text: formData.get("text") as string,
                description: formData.get("description") as string,
                platform: platform,
                visibility: isPublic ? "PUBLIC" : "PRIVATE",
                tags: (formData.get("tags") as string).split(",").map(t => t.trim()).filter(Boolean)
            })
            toast.success("Command created")
            setOpen(false)
            setPlatform("")
            setIsPublic(false)
        } catch (error) {
            toast.error("Failed to create command")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Command
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Command</DialogTitle>
                        <DialogDescription>
                            Add a new command to your vault.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">
                                Title
                            </Label>
                            <Input id="title" name="title" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="text" className="text-right">
                                Command
                            </Label>
                            <Textarea id="text" name="text" className="col-span-3 font-mono" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">
                                Description
                            </Label>
                            <Input id="description" name="description" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="platform" className="text-right">
                                Platform
                            </Label>
                            <Popover open={platformOpen} onOpenChange={setPlatformOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={platformOpen}
                                        className="w-[200px] justify-between col-span-3"
                                    >
                                        {platform
                                            ? platforms.find((framework) => framework.value === platform)?.label
                                            : "Select platform..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search platform..." />
                                        <CommandList>
                                            <CommandEmpty>No platform found.</CommandEmpty>
                                            <CommandGroup>
                                                {platforms.map((framework) => (
                                                    <CommandItem
                                                        key={framework.value}
                                                        value={framework.value}
                                                        onSelect={(currentValue) => {
                                                            setPlatform(currentValue === platform ? "" : currentValue)
                                                            setPlatformOpen(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                platform === framework.value ? "opacity-100" : "opacity-0"
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
                            <input type="hidden" name="platform" value={platform} required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="tags" className="text-right">
                                Tags
                            </Label>
                            <Input id="tags" name="tags" className="col-span-3" placeholder="git, docker (comma separated)" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="visibility" className="text-right">
                                Visibility
                            </Label>
                            <div className="flex items-center space-x-2 col-span-3">
                                <Switch
                                    id="visibility"
                                    checked={isPublic}
                                    onCheckedChange={setIsPublic}
                                />
                                <Label htmlFor="visibility" className="flex items-center gap-1 cursor-pointer">
                                    {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                    {isPublic ? "Public" : "Private"}
                                </Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !platform}>Save changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

