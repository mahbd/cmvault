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
    const { query, os: platform, pwd } = body as { query: string, os: string, pwd: string }

    if (!query) {
        return NextResponse.json([])
    }

    // Split query into terms for multi-word matching
    const terms = query.trim().split(/\s+/).filter(t => t.length > 0)

    if (terms.length === 0) {
        return NextResponse.json([])
    }

    const where: any = {
        userId: user.id,
        AND: terms.map(term => ({
            OR: [
                { text: { contains: term } },
            ]
        }))
    }

    // Filter by OS if provided
    if (platform) {
        where.AND.push({
            OR: [
                { platform: { contains: platform.toLowerCase() } },
                { platform: { contains: "others" } },
                // If platform is empty string, consider it valid for all
                { platform: { equals: "" } }
            ]
        })
    }

    const commands = await prisma.command.findMany({
        where,
        take: 20,
        orderBy: { usageCount: "desc" },
    })

    return NextResponse.json(commands.map(c => c.text))
}
