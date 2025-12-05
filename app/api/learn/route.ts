import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

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
    const { executed_command, os, pwd, directory_context } = body

    if (!executed_command) {
        return NextResponse.json({ error: "Missing command" }, { status: 400 })
    }

    await prisma.commandUsage.create({
        data: {
            command: executed_command,
            os,
            pwd,
            context: JSON.stringify(directory_context),
            userId: user.id,
        },
    })

    // Increment usage count if this command exists in user's vault
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
