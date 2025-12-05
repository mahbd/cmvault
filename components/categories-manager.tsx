"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createCategory, deleteCategory } from "@/app/actions/categories"
import { toast } from "sonner"
import { Trash2, Plus } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface Category {
    id: string
    name: string
}

export function CategoriesManager({ categories }: { categories: Category[] }) {
    const [newCategory, setNewCategory] = useState("")
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        if (!newCategory.trim()) return
        setLoading(true)
        try {
            await createCategory(newCategory)
            setNewCategory("")
            toast.success("Category created")
        } catch (error) {
            toast.error("Failed to create category")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteCategory(id)
            toast.success("Category deleted")
        } catch (error) {
            toast.error("Failed to delete category")
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Manage Categories
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Categories</DialogTitle>
                    <DialogDescription>
                        Manage your command categories.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="New category..."
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <Button onClick={handleCreate} disabled={loading}>Add</Button>
                    </div>
                    <div className="space-y-2">
                        {categories.map((category) => (
                            <div key={category.id} className="flex items-center justify-between rounded-md border p-2">
                                <span>{category.name}</span>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
