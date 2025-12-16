"use server"

import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import { headers } from "next/headers"

export async function getApiToken() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session?.user?.id) return null

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { apiToken: true }
    })

    return user?.apiToken ?? null
}

export async function generateApiToken() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session?.user?.id) throw new Error("Unauthorized")

    const token = `cmv_${crypto.randomBytes(32).toString("hex")}`

    await db.update(users).set({
        apiToken: token
    }).where(eq(users.id, session.user.id))

    revalidatePath("/dashboard")
    return token
}

export async function revokeApiToken() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session?.user?.id) throw new Error("Unauthorized")

    await db.update(users).set({
        apiToken: null
    }).where(eq(users.id, session.user.id))

    revalidatePath("/dashboard")
}

export async function generateTempCode() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    await db.update(users).set({
        tempCode: code,
        tempAuthCodeCreatedAt: new Date()
    }).where(eq(users.id, session.user.id))

    return code
}
