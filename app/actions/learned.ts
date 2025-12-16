"use server"


import { db } from "@/lib/db"
import { commandUsages } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
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

    return await db.query.commandUsages.findMany({
        where: eq(commandUsages.userId, session.user.id),
        orderBy: [desc(commandUsages.updatedAt)]
    })
}

export async function deleteLearnedCommand(id: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        throw new Error("Unauthorized")
    }

    const usage = await db.query.commandUsages.findFirst({
        where: eq(commandUsages.id, id)
    })

    if (!usage || usage.userId !== session.user.id) {
        throw new Error("Unauthorized")
    }

    await db.delete(commandUsages).where(eq(commandUsages.id, id))

    revalidatePath("/learned")
}
