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

    // 1. Fetch User's Learned Commands (CommandUsage)
    const userLearned = await prisma.commandUsage.findMany({
        where: {
            userId: user.id,
            command: { contains: query }, // Simple contains for now, or use terms logic if needed
            // For CommandUsage, we only have 'command' field, so multi-term check on single field:
            AND: terms.map(term => ({ command: { contains: term } }))
        },
        orderBy: { usageCount: "desc" },
        take: 10
    })

    // 2. Fetch User's Saved Commands (Command)
    const userSavedWhere: any = {
        userId: user.id,
        AND: terms.map(term => ({
            OR: [
                { text: { contains: term } },
                { title: { contains: term } },
                { description: { contains: term } },
            ]
        }))
    }
    if (platform) {
        userSavedWhere.AND.push({
            OR: [
                { platform: { contains: platform.toLowerCase() } },
                { platform: { contains: "others" } },
                { platform: { equals: "" } }
            ]
        })
    }
    const userSaved = await prisma.command.findMany({
        where: userSavedWhere,
        orderBy: { usageCount: "desc" },
        take: 10
    })

    // 3. Fetch Public Commands from Others
    const publicOthersWhere: any = {
        userId: { not: user.id },
        visibility: "PUBLIC",
        AND: terms.map(term => ({
            OR: [
                { text: { contains: term } },
                { title: { contains: term } },
                { description: { contains: term } },
            ]
        }))
    }
    if (platform) {
        publicOthersWhere.AND.push({
            OR: [
                { platform: { contains: platform.toLowerCase() } },
                { platform: { contains: "others" } },
                { platform: { equals: "" } }
            ]
        })
    }
    const publicOthers = await prisma.command.findMany({
        where: publicOthersWhere,
        orderBy: { usageCount: "desc" },
        take: 5
    })

    // Combine results
    const results: string[] = []
    const seen = new Set<string>()

    const add = (cmd: string) => {
        if (!seen.has(cmd)) {
            seen.add(cmd)
            results.push(cmd)
        }
    }

    // Slot 1: 1st from Learned
    if (userLearned.length > 0) add(userLearned[0].command)

    // Slot 2: 1st from Saved (if not same as slot 1)
    if (userSaved.length > 0) add(userSaved[0].text)

    // Slot 3 & 4: 1st and 2nd from Public Others
    if (publicOthers.length > 0) add(publicOthers[0].text)
    if (publicOthers.length > 1) add(publicOthers[1].text)

    // Rest: Mix remaining Learned and Saved, ranked by usage count
    // We'll merge the remaining lists and sort them
    const remainingLearned = userLearned.map(c => ({ text: c.command, count: c.usageCount }))
    const remainingSaved = userSaved.map(c => ({ text: c.text, count: c.usageCount }))

    const pool = [...remainingLearned, ...remainingSaved]
        .sort((a, b) => b.count - a.count)

    for (const item of pool) {
        if (results.length >= 10) break
        add(item.text)
    }

    return NextResponse.json(results)
}
