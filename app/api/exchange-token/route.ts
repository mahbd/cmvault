import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { code } = body

        if (!code || code.length !== 6) {
            return NextResponse.json({ error: "Invalid code format" }, { status: 400 })
        }

        // Find user with this code
        const user = await prisma.user.findFirst({
            where: { tempCode: code }
        })

        if (!user || !user.tempAuthCodeCreatedAt) {
            return NextResponse.json({ error: "Invalid code" }, { status: 401 })
        }

        // Check expiration (5 minutes)
        const diff = new Date().getTime() - new Date(user.tempAuthCodeCreatedAt).getTime()
        const minutes = diff / 1000 / 60

        if (minutes > 5) {
            return NextResponse.json({ error: "Code expired" }, { status: 401 })
        }

        // Check if user has an API token, if not generate one
        let token = user.apiToken
        if (!token) {
            const crypto = require("crypto")
            token = `cmv_${crypto.randomBytes(32).toString("hex")}`
            await prisma.user.update({
                where: { id: user.id },
                data: { apiToken: token, tempCode: null, tempAuthCodeCreatedAt: null } // Clear code after use
            })
        } else {
            // Just clear the code
            await prisma.user.update({
                where: { id: user.id },
                data: { tempCode: null, tempAuthCodeCreatedAt: null }
            })
        }

        return NextResponse.json({ token })

    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
