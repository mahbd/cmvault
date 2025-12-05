import { getCommands } from "@/app/actions/commands"
import { getCategories } from "@/app/actions/categories"
import { CommandList } from "@/components/command-list"
import { CreateCommandDialog } from "@/components/create-command-dialog"
import { CategoriesManager } from "@/components/categories-manager"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function Dashboard({ searchParams }: { searchParams: { q?: string } }) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    const query = (await searchParams).q || ""
    const commands = await getCommands()
    const categories = session ? await getCategories() : []

    // Server-side filtering or Client-side? 
    // For now, let's do client-side filtering in CommandList or filter here if we want server-side.
    // But getCommands fetches all. Let's filter here for simplicity or pass query to getCommands.
    // Let's pass query to getCommands later. For now, filter in memory.
    type CommandWithTags = Awaited<ReturnType<typeof getCommands>>[number]
    const filteredCommands = commands.filter((cmd: CommandWithTags) =>
        cmd.text.toLowerCase().includes(query.toLowerCase()) ||
        cmd.title?.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(query.toLowerCase()) ||
        cmd.tags.some((t: { tag: { name: string } }) => t.tag.name.toLowerCase().includes(query.toLowerCase()))
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <div className="flex-1 max-w-sm relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <form>
                        <Input
                            placeholder="Search commands..."
                            className="pl-8"
                            name="q"
                            defaultValue={query}
                        />
                    </form>
                </div>
                {session && (
                    <div className="flex gap-2">
                        <CategoriesManager categories={categories} />
                        <CreateCommandDialog />
                    </div>
                )}
            </div>
            <CommandList commands={filteredCommands} readOnly={!session} />
        </div>
    )
}
