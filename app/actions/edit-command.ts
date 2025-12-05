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

})

export async function updateCommand(id: string, data: z.infer<typeof commandSchema>) {
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

    const { tags, ...rest } = data

    // Transaction to update command and tags
    await prisma.$transaction(async (tx) => {
        // Update command details
        await tx.command.update({
            where: { id },
            data: {
                ...rest,
            }
        })

        // Update tags if provided
        if (tags) {
            // Remove existing tags
            await tx.commandTag.deleteMany({
                where: { commandId: id }
            })

            // Add new tags
            for (const tagName of tags) {
                // Find or create tag
                // Note: We need to handle tag creation carefully. 
                // If we assume tags are global or user specific. 
                // Let's assume user specific for now based on schema (Tag has userId).

                // We can't use connectOrCreate easily with non-unique name globally.
                // So we find first.
                let tag = await tx.tag.findFirst({
                    where: {
                        name: tagName,
                        userId: session.user.id
                    }
                })

                if (!tag) {
                    tag = await tx.tag.create({
                        data: {
                            name: tagName,
                            userId: session.user.id
                        }
                    })
                }

                await tx.commandTag.create({
                    data: {
                        commandId: id,
                        tagId: tag.id
                    }
                })
            }
        }
    })

    revalidatePath("/dashboard")
}
