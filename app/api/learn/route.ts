import { db } from "@/lib/db"
import { commandUsages, commands, users } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
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
    const user = await db.query.users.findFirst({
        where: eq(users.apiToken, token)
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
        const existing = await db.query.commandUsages.findFirst({
            where: and(
                eq(commandUsages.userId, user.id),
                eq(commandUsages.command, executed_command)
            )
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

            await db.update(commandUsages).set({
                context: JSON.stringify(updatedContext),
                os: os || existing.os,
                usageCount: sql`${commandUsages.usageCount} + 1`
            }).where(eq(commandUsages.id, existing.id))
        } else {
            // Try to create
            const initialContext = updateContext([], pwd, ls_output, os)

            await db.insert(commandUsages).values({
                command: executed_command,
                userId: user.id,
                os,
                context: JSON.stringify(initialContext),
                usageCount: 1,
            })
        }
    } catch (error: any) {
        // Handle race condition: unique constraint failed (23505 in postgres)
        if (error.code === '23505') {
            // Record was created by another request in the meantime, so update it
            const existing = await db.query.commandUsages.findFirst({
                where: and(
                    eq(commandUsages.userId, user.id),
                    eq(commandUsages.command, executed_command)
                )
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

                await db.update(commandUsages).set({
                    context: JSON.stringify(updatedContext),
                    os: os || existing.os,
                    usageCount: sql`${commandUsages.usageCount} + 1`
                }).where(eq(commandUsages.id, existing.id))
            }
        } else {
            throw error
        }
    }

    // Increment usage count in Command table if it exists
    const existingCommand = await db.query.commands.findFirst({
        where: and(
            eq(commands.userId, user.id),
            eq(commands.text, executed_command)
        )
    })

    if (existingCommand) {
        await db.update(commands).set({
            usageCount: sql`${commands.usageCount} + 1`
        }).where(eq(commands.id, existingCommand.id))
    }

    return NextResponse.json({ success: true })
}
