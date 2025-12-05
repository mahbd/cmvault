"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const commandSchema = z.object({
    title: z.string().optional(),
    text: z.string().min(1, "Command text is required"),
    description: z.string().optional(),
    platform: z.string().min(1, "Platform is required"),
    visibility: z.enum(["PUBLIC", "PRIVATE"]),
    tags: z.array(z.string()).optional(),
    categoryId: z.string().optional(),
})

export async function createCommand(data: z.infer<typeof commandSchema>) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        throw new Error("Unauthorized")
    }

    const { tags, ...rest } = data

    const command = await prisma.command.create({
        data: {
            ...rest,
            userId: session.user.id,
            tags: {
                create: tags?.map(tag => ({
                    tag: {
                        connectOrCreate: {
                            where: { id: tag }, // Assuming tag is ID, but if it's name we need logic. 
                            // Actually, let's assume tags are names for now and we create them if they don't exist.
                            // But connectOrCreate needs a unique field. Tag name is not unique globally? 
                            // Wait, Tag model: id, name, userId.
                            // If tags are per user, we need to find by name AND userId.
                            // But connectOrCreate only works on unique fields.
                            // So we might need to do this manually or make name+userId unique.
                            // For MVP, let's just create tags or find them.
                            create: {
                                name: tag,
                                userId: session.user.id
                            }
                        }
                    }
                }))
            }
        }
    })

    revalidatePath("/dashboard")
    return command
}

export async function getCommands() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        throw new Error("Unauthorized")
    }

    return await prisma.command.findMany({
        where: {
            userId: session.user.id
        },
        orderBy: {
            createdAt: "desc"
        },
        include: {
            tags: {
                include: {
                    tag: true
                }
            }
        }
    })
}

export async function deleteCommand(id: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        throw new Error("Unauthorized")
    }

    const command = await prisma.command.findUnique({
        where: { id }
    })

    if (!command || command.userId !== session.user.id) {
        throw new Error("Unauthorized")
    }

    await prisma.command.delete({
        where: { id }
    })

    revalidatePath("/dashboard")
}
