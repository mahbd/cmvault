"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import { headers } from "next/headers"

export async function getApiToken() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session?.user?.id) return null

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { apiToken: true }
    })

    return user?.apiToken ?? null
}

export async function generateApiToken() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session?.user?.id) throw new Error("Unauthorized")

    const token = `cmv_${crypto.randomBytes(32).toString("hex")}`

    await prisma.user.update({
        where: { id: session.user.id },
        data: { apiToken: token },
    })

    revalidatePath("/dashboard")
    return token
}

export async function revokeApiToken() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session?.user?.id) throw new Error("Unauthorized")

    await prisma.user.update({
        where: { id: session.user.id },
        data: { apiToken: null },
    })

    revalidatePath("/dashboard")
}
