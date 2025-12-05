import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, UNDO_COMMAND, REDO_COMMAND, $createTextNode, $createParagraphNode, CAN_UNDO_COMMAND, CAN_REDO_COMMAND, COMMAND_PRIORITY_CRITICAL, $createRangeSelection, $setSelection } from "lexical"
import {
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
} from "@lexical/markdown"
import { $createQuoteNode } from "@lexical/rich-text"
import { $createListNode, $createListItemNode } from "@lexical/list"
import { $createCodeNode } from "@lexical/code"
import { $createTableNode } from "@lexical/table"
import { $createHorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode"
import { $createLinkNode, TOGGLE_LINK_COMMAND, $isLinkNode } from "@lexical/link"
import { $findMatchingParent } from "@lexical/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    Quote,
    Code,
    Undo,
    Redo,
    Table,
    Minus,
    Subscript,
    Superscript,
    Link,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { SourceCodeToolbarPlugin } from "./source-code-toolbar-plugin"
import { FullscreenPlugin } from "../fullscreen-plugin"
import { AssetLibraryPlugin } from "../asset-library-plugin"
import { TextStylingDropdownPlugin } from "./text-styling-dropdown-plugin"
import { FontSizeDropdownPlugin } from "./font-size-dropdown-plugin"
import { HeadingsDropdownPlugin } from "./headings-dropdown-plugin"
import { TextColorPlugin } from "./text-color-plugin"
import { BackgroundColorPlugin } from "./background-color-plugin"
import { ClearFormattingPlugin } from "./clear-formatting-plugin"
import { AlignmentIndentPlugin } from "./alignment-indent-plugin"
import { LinkInsertModal } from "./link-insert-modal"
import { TableInsertModal } from "./table-insert-modal"
import { getSelectedNode } from "@/components/editor/utils/get-selected-node"
import { TreeViewPlugin } from "../tree-view-plugin"
import { MarkdownTogglePlugin } from "../markdown-toggle-plugin"

export function BasicToolbar() {
    const [editor] = useLexicalComposerContext()
    const [isBold, setIsBold] = useState(false)
    const [isItalic, setIsItalic] = useState(false)
    const [isUnderline, setIsUnderline] = useState(false)
    const [isStrikethrough, setIsStrikethrough] = useState(false)
    const [isSubscript, setIsSubscript] = useState(false)
    const [isSuperscript, setIsSuperscript] = useState(false)
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
    const [isTableModalOpen, setIsTableModalOpen] = useState(false)
    const [selectedText, setSelectedText] = useState("")
    const [isLinkSelected, setIsLinkSelected] = useState(false)
    const [selectedLinkData, setSelectedLinkData] = useState<{ url: string; target: string; text: string } | null>(null)

    const updateToolbar = useCallback(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
            setIsBold(selection.hasFormat('bold'))
            setIsItalic(selection.hasFormat('italic'))
            setIsUnderline(selection.hasFormat('underline'))
            setIsStrikethrough(selection.hasFormat('strikethrough'))
            setIsSubscript(selection.hasFormat('subscript'))
            setIsSuperscript(selection.hasFormat('superscript'))
            setSelectedText(selection.getTextContent())
            
            // Check if a link is selected
            const selectedNode = getSelectedNode(selection)
            const linkParent = $findMatchingParent(selectedNode, $isLinkNode)
            
            if (linkParent) {
                setIsLinkSelected(true)
                setSelectedLinkData({
                    url: linkParent.getURL(),
                    target: linkParent.getTarget() || "_self",
                    text: linkParent.getTextContent()
                })
            } else {
                setIsLinkSelected(false)
                setSelectedLinkData(null)
            }
        }
    }, [])

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                updateToolbar()
            })
        })
    }, [editor, updateToolbar])

    // Register history commands
    useEffect(() => {
        return editor.registerCommand<boolean>(
            CAN_UNDO_COMMAND,
            (payload) => {
                setCanUndo(payload)
                return false
            },
            COMMAND_PRIORITY_CRITICAL
        )
    }, [editor])

    useEffect(() => {
        return editor.registerCommand<boolean>(
            CAN_REDO_COMMAND,
            (payload) => {
                setCanRedo(payload)
                return false
            },
            COMMAND_PRIORITY_CRITICAL
        )
    }, [editor])

    const formatText = (format: "bold" | "italic" | "underline" | "strikethrough" | "subscript" | "superscript") => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
    }

    const insertList = (type: "bullet" | "number") => {
        editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
                const listNode = $createListNode(type === "bullet" ? "bullet" : "number")
                const listItemNode = $createListItemNode()
                const textContent = selection.getTextContent()
                if (textContent) {
                    listItemNode.append($createParagraphNode().append($createTextNode(textContent)))
                }
                listNode.append(listItemNode)
                selection.insertNodes([listNode])
            }
        })
    }

    const insertQuote = () => {
        editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
                const quoteNode = $createQuoteNode()
                const textContent = selection.getTextContent()
                if (textContent) {
                    quoteNode.append($createParagraphNode().append($createTextNode(textContent)))
                }
                selection.insertNodes([quoteNode])
            }
        })
    }

    const insertCode = () => {
        editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
                const codeNode = $createCodeNode()
                const textContent = selection.getTextContent()
                if (textContent) {
                    codeNode.append($createTextNode(textContent))
                }
                selection.insertNodes([codeNode])
            }
        })
    }



    const insertHorizontalRule = () => {
        editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
                const hrNode = $createHorizontalRuleNode()
                selection.insertNodes([hrNode])
            }
        })
    }

    const insertLink = () => {
        setIsLinkModalOpen(true)
    }

    const editLink = () => {
        setIsLinkModalOpen(true)
    }

    const insertTable = () => {
        setIsTableModalOpen(true)
    }

    const handleLinkInsert = (url: string, target: string, linkText: string) => {
        editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
                if (isLinkSelected && selectedLinkData) {
                    // For editing existing links, use a safer approach
                    // First, remove the existing link using the command
                    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
                    
                    // Then insert the new link with the updated content
                    const linkNode = $createLinkNode(url)
                    linkNode.setTarget(target)
                    const textNode = $createTextNode(linkText)
                    linkNode.append(textNode)
                    selection.insertNodes([linkNode])
                } else {
                    // Insert new link
                    const linkNode = $createLinkNode(url)
                    linkNode.setTarget(target)
                    
                    // Use the provided link text
                    const textNode = $createTextNode(linkText)
                    linkNode.append(textNode)
                    selection.insertNodes([linkNode])
                }
            }
        })
    }

    return (
        <div>
            <div className="flex items-center gap-1 p-2 border-b flex-wrap">
                
                <SourceCodeToolbarPlugin />
                <TreeViewPlugin />
                <FullscreenPlugin />
                <MarkdownTogglePlugin 
                  shouldPreserveNewLinesInMarkdown={true}
                  transformers={[
                    CHECK_LIST,
                    ...ELEMENT_TRANSFORMERS,
                    ...MULTILINE_ELEMENT_TRANSFORMERS,
                    ...TEXT_FORMAT_TRANSFORMERS,
                    ...TEXT_MATCH_TRANSFORMERS,
                  ]}
                />

                <div className="h-6 w-px mx-2 bg-gray-300 dark:bg-gray-600" />

                {/* History */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
                            disabled={!canUndo}
                            className="h-8 w-8 p-0"
                        >
                            <Undo className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Undo</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
                            disabled={!canRedo}
                            className="h-8 w-8 p-0"
                        >
                            <Redo className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Redo</p>
                    </TooltipContent>
                </Tooltip>

                <div className="h-6 w-px mx-2 bg-gray-300 dark:bg-gray-600" />

                <AssetLibraryPlugin />
                
                
                

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isLinkSelected ? "default" : "ghost"}
                            size="sm"
                            onClick={isLinkSelected ? editLink : insertLink}
                            className="h-8 w-8 p-0"
                        >
                            <Link className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isLinkSelected ? "Edit Link" : "Insert Link"}</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={insertTable}
                            className="h-8 w-8 p-0"
                        >
                            <Table className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Insert Table</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            <div className="flex items-center gap-1 p-2 border-b flex-wrap">
                <HeadingsDropdownPlugin />
                <TextStylingDropdownPlugin />
                <FontSizeDropdownPlugin />

                <div className="h-6 w-px mx-2 bg-gray-200 dark:bg-gray-500" />
                {/* Text Formatting */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isBold ? "default" : "ghost"}
                            size="sm"
                            onClick={() => formatText("bold")}
                            className="h-8 w-8 p-0"
                        >
                            <Bold className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Bold</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isItalic ? "default" : "ghost"}
                            size="sm"
                            onClick={() => formatText("italic")}
                            className="h-8 w-8 p-0"
                        >
                            <Italic className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Italic</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isUnderline ? "default" : "ghost"}
                            size="sm"
                            onClick={() => formatText("underline")}
                            className="h-8 w-8 p-0"
                        >
                            <Underline className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Underline</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isStrikethrough ? "default" : "ghost"}
                            size="sm"
                            onClick={() => formatText("strikethrough")}
                            className="h-8 w-8 p-0"
                        >
                            <Strikethrough className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Strikethrough</p>
                    </TooltipContent>
                </Tooltip>
                <div className="h-6 w-px mx-2 bg-gray-200 dark:bg-gray-500" />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isSubscript ? "default" : "ghost"}
                            size="sm"
                            onClick={() => formatText("subscript")}
                            className="h-8 w-8 p-0"
                        >
                            <Subscript className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Subscript</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isSuperscript ? "default" : "ghost"}
                            size="sm"
                            onClick={() => formatText("superscript")}
                            className="h-8 w-8 p-0"
                        >
                            <Superscript className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Superscript</p>
                    </TooltipContent>
                </Tooltip>
               

                <div className="h-6 w-px mx-2 bg-gray-200 dark:bg-gray-500" />

                <TextColorPlugin />
                <BackgroundColorPlugin />
                <ClearFormattingPlugin />

                <div className="h-6 w-px mx-2 bg-gray-200 dark:bg-gray-500" />

                <AlignmentIndentPlugin />

                <div className="h-6 w-px mx-2 bg-gray-200 dark:bg-gray-500" />

                {/* Lists */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertList("bullet")}
                            className="h-8 w-8 p-0"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Bullet List</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertList("number")}
                            className="h-8 w-8 p-0"
                        >
                            <ListOrdered className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Numbered List</p>
                    </TooltipContent>
                </Tooltip>

                <div className="h-6 w-px mx-2 bg-gray-200 dark:bg-gray-500" />

                {/* Block Elements */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={insertQuote}
                            className="h-8 w-8 p-0"
                        >
                            <Quote className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Quote</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={insertCode}
                            className="h-8 w-8 p-0"
                        >
                            <Code className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Code Block</p>
                    </TooltipContent>
                </Tooltip>

                {/* Insert Elements */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={insertHorizontalRule}
                            className="h-8 w-8 p-0"
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Horizontal Rule</p>
                    </TooltipContent>
                </Tooltip>

                <div className="h-6 w-px mx-2 bg-gray-200 dark:bg-gray-500" />
            </div>
            
            <LinkInsertModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                onInsert={handleLinkInsert}
                selectedText={selectedText}
                existingLinkData={selectedLinkData}
            />
            
            <TableInsertModal
                isOpen={isTableModalOpen}
                onClose={() => setIsTableModalOpen(false)}
            />
        </div>
    )
} 