"use server"

import { db } from "@/lib/db"
import { commands, tags as tagsSchema, commandTags } from "@/lib/db/schema"
import { eq, desc, and } from "drizzle-orm"
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

})

export async function createCommand(data: z.infer<typeof commandSchema>) {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        throw new Error("Unauthorized")
    }

    const { tags, ...rest } = data

    const command = await db.transaction(async (tx) => {
        const [command] = await tx.insert(commands).values({
            ...rest,
            userId: session.user.id,
        }).returning()

        if (tags && tags.length > 0) {
            for (const tagName of tags) {
                let [tag] = await tx.select().from(tagsSchema).where(
                    and(eq(tagsSchema.name, tagName), eq(tagsSchema.userId, session.user.id))
                )

                if (!tag) {
                    [tag] = await tx.insert(tagsSchema).values({
                        name: tagName,
                        userId: session.user.id
                    }).returning()
                }

                await tx.insert(commandTags).values({
                    commandId: command.id,
                    tagId: tag.id
                })
            }
        }
        return command
    })

    revalidatePath("/dashboard")
    return command
}

export async function getCommands() {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        return await db.query.commands.findMany({
            where: eq(commands.visibility, "PUBLIC"),
            orderBy: [desc(commands.createdAt)],
            with: {
                tags: {
                    with: {
                        tag: true
                    }
                }
            }
        })
    }

    return await db.query.commands.findMany({
        where: eq(commands.userId, session.user.id),
        orderBy: [desc(commands.createdAt)],
        with: {
            tags: {
                with: {
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

    const command = await db.query.commands.findFirst({
        where: eq(commands.id, id)
    })

    if (!command || command.userId !== session.user.id) {
        throw new Error("Unauthorized")
    }

    await db.delete(commands).where(eq(commands.id, id))

    revalidatePath("/dashboard")
}
