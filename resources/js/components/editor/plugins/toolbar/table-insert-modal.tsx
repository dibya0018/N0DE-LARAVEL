import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { $createTableNodeWithDimensions, INSERT_TABLE_COMMAND } from "@lexical/table"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"

interface TableInsertModalProps {
    isOpen: boolean
    onClose: () => void
}

export function TableInsertModal({ isOpen, onClose }: TableInsertModalProps) {
    const [editor] = useLexicalComposerContext()
    const [rows, setRows] = useState("3")
    const [columns, setColumns] = useState("3")
    const [isDisabled, setIsDisabled] = useState(true)

    useEffect(() => {
        const row = Number(rows)
        const column = Number(columns)
        if (row && row > 0 && row <= 500 && column && column > 0 && column <= 50) {
            setIsDisabled(false)
        } else {
            setIsDisabled(true)
        }
    }, [rows, columns])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!isDisabled) {
            editor.dispatchCommand(INSERT_TABLE_COMMAND, {
                columns,
                rows,
            })
            onClose()
        }
    }

    const handleCancel = () => {
        setRows("3")
        setColumns("3")
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Insert Table</DialogTitle>
                    <DialogDescription>
                        Specify the number of rows and columns for your new table.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rows">Number of rows</Label>
                            <Input
                                id="rows"
                                placeholder="# of rows (1-500)"
                                onChange={(e) => setRows(e.target.value)}
                                value={rows}
                                type="number"
                                min="1"
                                max="500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="columns">Number of columns</Label>
                            <Input
                                id="columns"
                                placeholder="# of columns (1-50)"
                                onChange={(e) => setColumns(e.target.value)}
                                value={columns}
                                type="number"
                                min="1"
                                max="50"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isDisabled}>
                            Insert Table
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
} 