import { auth } from "@/lib/auth"
import { getLearnedCommands } from "@/app/actions/learned"
import { LearnedClient } from "./learned-client"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function LearnedPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        redirect("/")
    }

    const learnedCommands = await getLearnedCommands()

    return (
        <div className="container mx-auto">
            <LearnedClient
                initialCommands={learnedCommands}
                session={session}
            />
        </div>
    )
}
