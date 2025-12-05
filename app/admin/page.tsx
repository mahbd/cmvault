import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminDashboard() {
    const userCount = await prisma.user.count()
    const commandCount = await prisma.command.count()
    const publicCommandCount = await prisma.command.count({
        where: { visibility: "PUBLIC" }
    })

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
