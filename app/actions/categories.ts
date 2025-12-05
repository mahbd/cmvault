"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

export async function getCategories() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        throw new Error("Unauthorized")
    }

    return await prisma.category.findMany({
        where: { userId: session.user.id },
        orderBy: { name: "asc" }
    })
}

export async function createCategory(name: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        throw new Error("Unauthorized")
    }

    await prisma.category.create({
        data: {
            name,
            userId: session.user.id
        }
    })

    revalidatePath("/dashboard")
}

export async function deleteCategory(id: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        throw new Error("Unauthorized")
    }

    await prisma.category.delete({
        where: { id }
    })

    revalidatePath("/dashboard")
}
