import { auth } from "@/lib/auth"
import { getCommands } from "@/app/actions/commands"
import { DashboardClient } from "./dashboard-client"

import { headers } from "next/headers"

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    const commands = await getCommands()

    return (
        <div className="container mx-auto -mt-5">
            <DashboardClient
                initialCommands={commands}
                session={session}
            />
        </div>
    )
}
