import { auth } from "@/lib/auth"
import { getApiToken } from "@/app/actions/api-tokens"
import { ApiTokenManager } from "@/components/api-token-manager"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function SettingsPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        redirect("/sign-in")
    }

    const apiToken = await getApiToken()

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>
            <div className="grid gap-6 max-w-2xl">
                <ApiTokenManager initialToken={apiToken} />
            </div>
        </div>
    )
}
