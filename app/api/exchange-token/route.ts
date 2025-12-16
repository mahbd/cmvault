import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { code } = body

        if (!code || code.length !== 6) {
            return NextResponse.json({ error: "Invalid code format" }, { status: 400 })
        }

        // Find user with this code
        const user = await db.query.users.findFirst({
            where: eq(users.tempCode, code)
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
            token = `cmv_${crypto.randomBytes(32).toString("hex")}`
            await db.update(users).set({
                apiToken: token,
                tempCode: null,
                tempAuthCodeCreatedAt: null
            }).where(eq(users.id, user.id))
        } else {
            // Just clear the code
            await db.update(users).set({
                tempCode: null,
                tempAuthCodeCreatedAt: null
            }).where(eq(users.id, user.id))
        }

        return NextResponse.json({ token })

    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
