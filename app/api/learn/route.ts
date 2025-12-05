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

    // Find existing usage
    const existingUsage = await prisma.commandUsage.findUnique({
        where: {
            userId_command: {
                userId: user.id,
                command: executed_command,
            },
        },
    })

    let context: ContextEntry[] = []
    if (existingUsage?.context) {
        try {
            context = JSON.parse(existingUsage.context)
        } catch (e) {
            context = []
        }
    }

    const currentTime = Date.now()
    const existingEntryIndex = context.findIndex(entry => entry.directory === pwd)

    if (existingEntryIndex !== -1) {
        // Update existing entry
        context[existingEntryIndex].count += 1
        context[existingEntryIndex].time = currentTime
        // Replace ls output if provided (assuming latest is best)
        if (ls_output) {
            context[existingEntryIndex].lsOutput = ls_output
        }
    } else {
        // Add new entry
        context.push({
            directory: pwd || "",
            time: currentTime,
            count: 1,
            lsOutput: ls_output || ""
        })
    }

    await prisma.commandUsage.upsert({
        where: {
            userId_command: {
                userId: user.id,
                command: executed_command,
            },
        },
        update: {
            context: JSON.stringify(context),
            os: os || existingUsage?.os, // Update OS if provided
        },
        create: {
            command: executed_command,
            userId: user.id,
            os,
            context: JSON.stringify(context),
        },
    })

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
