import { auth } from "@/lib/auth"
import { getCommands } from "@/app/actions/commands"
import { getCategories } from "@/app/actions/categories"
import { DashboardClient } from "./dashboard-client"

import { headers } from "next/headers"

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    const commands = await getCommands()
    const categories = await getCategories()

    return (
        <div className="container mx-auto -mt-5">
            <DashboardClient
                initialCommands={commands}
                categories={categories}
                session={session}
            />
        </div>
    )
}
