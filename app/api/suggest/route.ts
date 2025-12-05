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
    const { query, os, pwd } = body

    if (!query) {
        return NextResponse.json([])
    }

    // Simple fuzzy search for now
    const commands = await prisma.command.findMany({
        where: {
            userId: user.id,
            OR: [
                { text: { contains: query } },
                { title: { contains: query } },
                { description: { contains: query } },
            ],
        },
        take: 5,
        orderBy: { usageCount: "desc" },
    })

    // Filter by OS if possible (simple string match for now)
    const relevantCommands = commands.filter(cmd => {
        if (!cmd.platform) return true
        if (cmd.platform.toLowerCase().includes("others")) return true
        if (os && cmd.platform.toLowerCase().includes(os.toLowerCase())) return true
        return false
    })

    const finalCommands = relevantCommands.length > 0 ? relevantCommands : commands

    return NextResponse.json(finalCommands.map(c => c.text))
}
