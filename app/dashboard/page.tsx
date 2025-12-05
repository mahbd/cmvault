import { getCommands } from "@/app/actions/commands"
import { getCategories } from "@/app/actions/categories"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { DashboardClient } from "./dashboard-client"

export default async function Dashboard({ searchParams }: { searchParams: { q?: string } }) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    const query = (await searchParams).q || ""
    const commands = await getCommands()
    const categories = session ? await getCategories() : []

    return (
        <DashboardClient
            initialCommands={commands}
            categories={categories}
            session={session}
            initialQuery={query}
        />
    )
}
