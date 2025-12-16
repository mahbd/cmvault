"use server"

import { db } from "@/lib/db"
import { commands, tags as tagsSchema, commandTags } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
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

export async function updateCommand(id: string, data: z.infer<typeof commandSchema>) {
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

    const { tags, ...rest } = data

    await db.transaction(async (tx) => {
        // Update command details
        await tx.update(commands).set({
            ...rest
        }).where(eq(commands.id, id))

        // Update tags if provided
        if (tags) {
            // Remove existing tags
            await tx.delete(commandTags).where(eq(commandTags.commandId, id))

            // Add new tags
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
                    commandId: id,
                    tagId: tag.id
                })
            }
        }
    })

    revalidatePath("/dashboard")
}
