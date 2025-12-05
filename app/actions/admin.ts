"use server"

import { prisma } from "@/lib/prisma"
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
    return await prisma.user.findMany({
        orderBy: { createdAt: "desc" }
    })
}

export async function toggleBlockUser(userId: string, isBlocked: boolean) {
    await checkAdmin()
    await prisma.user.update({
        where: { id: userId },
        data: { role: isBlocked ? "BLOCKED" : "USER" }
    })
    revalidatePath("/admin/users")
}

export async function getPublicCommands() {
    await checkAdmin()
    return await prisma.command.findMany({
        where: { visibility: "PUBLIC" },
        include: { user: true },
        orderBy: { createdAt: "desc" }
    })
}

export async function adminDeleteCommand(commandId: string) {
    await checkAdmin()
    await prisma.command.delete({
        where: { id: commandId }
    })
    revalidatePath("/admin/commands")
}
