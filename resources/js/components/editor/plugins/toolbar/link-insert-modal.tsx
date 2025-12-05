import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import MultiSelect from "@/components/ui/select/Select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface LinkInsertModalProps {
    isOpen: boolean
    onClose: () => void
    onInsert: (url: string, target: string, linkText: string) => void
    selectedText?: string
    existingLinkData?: { url: string; target: string; text: string } | null
}

const targetOptions = [
    { value: "_self", label: "Same window" },
    { value: "_blank", label: "New window" },
    { value: "_parent", label: "Parent frame" },
    { value: "_top", label: "Full window" },
]

export function LinkInsertModal({ isOpen, onClose, onInsert, selectedText, existingLinkData }: LinkInsertModalProps) {
    const [url, setUrl] = useState("")
    const [linkText, setLinkText] = useState(selectedText || "")
    const [target, setTarget] = useState(targetOptions[0])

    // Reset form when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            if (existingLinkData) {
                // Edit mode - pre-fill with existing link data
                setUrl(existingLinkData.url)
                setLinkText(existingLinkData.text)
                setTarget(targetOptions.find(option => option.value === existingLinkData.target) || targetOptions[0])
            } else {
                // Insert mode - pre-fill with selected text if available
                setLinkText(selectedText || "")
                setUrl("")
                setTarget(targetOptions[0])
            }
        }
    }, [isOpen, selectedText, existingLinkData])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (url.trim() && linkText.trim()) {
            onInsert(url.trim(), target.value, linkText.trim())
            setUrl("")
            setLinkText("")
            setTarget(targetOptions[0])
            onClose()
        }
    }

    const handleCancel = () => {
        setUrl("")
        setLinkText("")
        setTarget(targetOptions[0])
        onClose()
    }



    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{existingLinkData ? "Edit Link" : "Insert Link"}</DialogTitle>
                    <DialogDescription>
                        {existingLinkData 
                            ? "Modify the link properties including URL, text, and target window."
                            : "Add a link to your content by specifying the URL and display text."
                        }
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="url">URL</Label>
                        <Input
                            id="url"
                            type="url"
                            placeholder="https://example.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="linkText">Link Text</Label>
                        <Input
                            id="linkText"
                            type="text"
                            placeholder="Enter link text"
                            value={linkText}
                            onChange={(e) => setLinkText(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="target">Open in</Label>
                        <MultiSelect
                            id="target"
                            value={target}
                            onChange={(option) => setTarget(option as typeof targetOptions[0])}
                            options={targetOptions}
                            isSearchable={false}
                            placeholder="Select target"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!url.trim() || !linkText.trim()}>
                            {existingLinkData ? "Update Link" : "Insert Link"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
} 