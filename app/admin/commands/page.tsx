import { getPublicCommands, adminDeleteCommand } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Trash2 } from "lucide-react"

export default async function AdminCommandsPage() {
    const commands = await getPublicCommands()

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Command Moderation</h1>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Command</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {commands.map((command: any) => (
                            <TableRow key={command.id}>
                                <TableCell>{command.title || "No Title"}</TableCell>
                                <TableCell className="font-mono text-sm">{command.text.slice(0, 50)}...</TableCell>
                                <TableCell>{command.user.name || command.user.email}</TableCell>
                                <TableCell>
                                    <form action={async () => {
                                        "use server"
                                        await adminDeleteCommand(command.id)
                                    }}>
                                        <Button variant="ghost" size="icon">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </form>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
