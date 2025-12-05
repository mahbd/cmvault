"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

export async function getLearnedCommands() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        return []
    }

    return await prisma.commandUsage.findMany({
        where: {
            userId: session.user.id
        },
        orderBy: {
            updatedAt: "desc"
        }
    })
}

export async function deleteLearnedCommand(id: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        throw new Error("Unauthorized")
    }

    const usage = await prisma.commandUsage.findUnique({
        where: { id }
    })

    if (!usage || usage.userId !== session.user.id) {
        throw new Error("Unauthorized")
    }

    await prisma.commandUsage.delete({
        where: { id }
    })

    revalidatePath("/learned")
}
