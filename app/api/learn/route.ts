import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

interface ContextEntry {
    directory: string
    time: number
    count: number
    lsOutput: string
}

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const user = await prisma.user.findUnique({
        where: { apiToken: token },
    })

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { executed_command, os, pwd, ls_output } = body

    if (!executed_command) {
        return NextResponse.json({ error: "Missing command" }, { status: 400 })
    }

    // Helper to update context
    const updateContext = (currentContext: ContextEntry[], pwd: string, lsOutput: string, os: string | undefined) => {
        const currentTime = Date.now()
        const index = currentContext.findIndex(entry => entry.directory === pwd)

        if (index !== -1) {
            currentContext[index].count += 1
            currentContext[index].time = currentTime
            if (lsOutput) currentContext[index].lsOutput = lsOutput
        } else {
            currentContext.push({
                directory: pwd || "",
                time: currentTime,
                count: 1,
                lsOutput: lsOutput || ""
            })
        }
        return currentContext
    }

    try {
        // Try to find existing first
        const existing = await prisma.commandUsage.findUnique({
            where: {
                userId_command: {
                    userId: user.id,
                    command: executed_command,
                },
            },
        })

        if (existing) {
            let context: ContextEntry[] = []
            try {
                const parsed = JSON.parse(existing.context || "[]")
                context = Array.isArray(parsed) ? parsed : []
            } catch {
                context = []
            }

            const updatedContext = updateContext(context, pwd, ls_output, os)

            await prisma.commandUsage.update({
                where: { id: existing.id },
                data: {
                    context: JSON.stringify(updatedContext),
                    os: os || existing.os,
                    usageCount: { increment: 1 },
                },
            })
        } else {
            // Try to create
            const initialContext = updateContext([], pwd, ls_output, os)

            await prisma.commandUsage.create({
                data: {
                    command: executed_command,
                    userId: user.id,
                    os,
                    context: JSON.stringify(initialContext),
                    usageCount: 1,
                },
            })
        }
    } catch (error: any) {
        // Handle race condition: unique constraint failed (P2002)
        if (error.code === 'P2002') {
            // Record was created by another request in the meantime, so update it
            const existing = await prisma.commandUsage.findUnique({
                where: {
                    userId_command: {
                        userId: user.id,
                        command: executed_command,
                    },
                },
            })

            if (existing) {
                let context: ContextEntry[] = []
                try {
                    const parsed = JSON.parse(existing.context || "[]")
                    context = Array.isArray(parsed) ? parsed : []
                } catch {
                    context = []
                }

                const updatedContext = updateContext(context, pwd, ls_output, os)

                await prisma.commandUsage.update({
                    where: { id: existing.id },
                    data: {
                        context: JSON.stringify(updatedContext),
                        os: os || existing.os,
                        usageCount: { increment: 1 },
                    },
                })
            }
        } else {
            throw error
        }
    }

    // Increment usage count in Command table if it exists
    const existingCommand = await prisma.command.findFirst({
        where: {
            userId: user.id,
            text: executed_command,
        },
    })

    if (existingCommand) {
        await prisma.command.update({
            where: { id: existingCommand.id },
            data: { usageCount: { increment: 1 } },
        })
    }

    return NextResponse.json({ success: true })
}
