"use server"

import { db } from "@/lib/db"
import { users, commands } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

async function checkAdmin() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }
    return session
}

export async function getUsers() {
    await checkAdmin()
    return await db.query.users.findMany({
        orderBy: [desc(users.createdAt)]
    })
}

export async function toggleBlockUser(userId: string, isBlocked: boolean) {
    await checkAdmin()
    await db.update(users)
        .set({ role: isBlocked ? "BLOCKED" : "USER" })
        .where(eq(users.id, userId))
    revalidatePath("/admin/users")
}

export async function getPublicCommands() {
    await checkAdmin()
    return await db.query.commands.findMany({
        where: eq(commands.visibility, "PUBLIC"),
        with: { user: true },
        orderBy: [desc(commands.createdAt)]
    })
}

export async function adminDeleteCommand(commandId: string) {
    await checkAdmin()
    await db.delete(commands).where(eq(commands.id, commandId))
    revalidatePath("/admin/commands")
}
