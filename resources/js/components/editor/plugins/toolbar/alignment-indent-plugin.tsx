import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getSelection, $isRangeSelection, FORMAT_ELEMENT_COMMAND, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND, ElementFormatType } from "lexical"
import { $isElementNode } from "lexical"
import { $findMatchingParent } from "@lexical/utils"
import { $isLinkNode } from "@lexical/link"
import { getSelectedNode } from "@/components/editor/utils/get-selected-node"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    IndentIncrease,
    IndentDecrease,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

export function AlignmentIndentPlugin() {
    const [editor] = useLexicalComposerContext()
    const [elementFormat, setElementFormat] = useState<ElementFormatType>("left")

    const updateToolbar = useCallback(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
            const node = getSelectedNode(selection)
            const parent = node.getParent()

            let matchingParent
            if ($isLinkNode(parent)) {
                // If node is a link, we need to fetch the parent paragraph node to set format
                matchingParent = $findMatchingParent(
                    node,
                    (parentNode) => $isElementNode(parentNode) && !parentNode.isInline()
                )
            }
            setElementFormat(
                $isElementNode(matchingParent)
                    ? matchingParent.getFormatType()
                    : $isElementNode(node)
                        ? node.getFormatType()
                        : parent?.getFormatType() || "left"
            )
        }
    }, [])

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                updateToolbar()
            })
        })
    }, [editor, updateToolbar])

    const handleAlignment = (format: ElementFormatType) => {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format)
    }

    const handleIndent = () => {
        editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)
    }

    const handleOutdent = () => {
        editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)
    }

    return (
        <>
            {/* Alignment buttons */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={elementFormat === "left" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleAlignment("left")}
                        className="h-8 w-8 p-0"
                    >
                        <AlignLeft className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Align Left</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={elementFormat === "center" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleAlignment("center")}
                        className="h-8 w-8 p-0"
                    >
                        <AlignCenter className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Align Center</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={elementFormat === "right" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleAlignment("right")}
                        className="h-8 w-8 p-0"
                    >
                        <AlignRight className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Align Right</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={elementFormat === "justify" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleAlignment("justify")}
                        className="h-8 w-8 p-0"
                    >
                        <AlignJustify className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Justify</p>
                </TooltipContent>
            </Tooltip>

            <div className="h-6 w-px mx-2 bg-gray-200 dark:bg-gray-500" />

            {/* Indent buttons */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleOutdent}
                        className="h-8 w-8 p-0"
                    >
                        <IndentDecrease className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Decrease Indent</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleIndent}
                        className="h-8 w-8 p-0"
                    >
                        <IndentIncrease className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Increase Indent</p>
                </TooltipContent>
            </Tooltip>
        </>
    )
} 