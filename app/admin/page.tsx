import { db } from "@/lib/db"
import { users, commands } from "@/lib/db/schema"
import { count, eq } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminDashboard() {
    const [userCountResult] = await db.select({ value: count() }).from(users)
    const userCount = userCountResult.value

    const [commandCountResult] = await db.select({ value: count() }).from(commands)
    const commandCount = commandCountResult.value

    const [publicCommandCountResult] = await db.select({ value: count() }).from(commands).where(eq(commands.visibility, "PUBLIC"))
    const publicCommandCount = publicCommandCountResult.value

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Commands</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{commandCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Public Commands</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{publicCommandCount}</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
