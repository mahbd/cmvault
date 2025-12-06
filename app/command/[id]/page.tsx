import { CreateCommandForm } from "@/components/create-command-form"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"

interface EditCommandPageProps {
    params: {
        id: string
    }
}

export default async function EditCommandPage({ params }: EditCommandPageProps) {
    const session = await auth()
    if (!session?.user) return notFound()

    const command = await prisma.command.findUnique({
        where: {
            id: params.id,
            userId: session.user.id
        },
        include: {
            tags: {
                include: {
                    tag: true
                }
            }
        }
    })

    if (!command) return notFound()

    return (
        <div className="container max-w-2xl py-10">
            <CreateCommandForm initialData={command} />
        </div>
    )
}
