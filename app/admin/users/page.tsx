import { getUsers, toggleBlockUser } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function AdminUsersPage() {
    const users = await getUsers()

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">User Management</h1>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user: any) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.role === "ADMIN" ? "default" : user.role === "BLOCKED" ? "destructive" : "secondary"}>
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {user.role !== "ADMIN" && (
                                        <form action={async () => {
                                            "use server"
                                            await toggleBlockUser(user.id, user.role !== "BLOCKED")
                                        }}>
                                            <Button variant="outline" size="sm">
                                                {user.role === "BLOCKED" ? "Unblock" : "Block"}
                                            </Button>
                                        </form>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
