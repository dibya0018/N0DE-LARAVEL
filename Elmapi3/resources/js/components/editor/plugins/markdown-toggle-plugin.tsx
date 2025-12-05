import { useCallback, useState, useEffect } from "react"
import { $createCodeNode, $isCodeNode } from "@lexical/code"
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  Transformer,
} from "@lexical/markdown"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $createTextNode, $getRoot } from "lexical"
import { FileTextIcon, TypeIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function MarkdownTogglePlugin({
  shouldPreserveNewLinesInMarkdown,
  transformers,
}: {
  shouldPreserveNewLinesInMarkdown: boolean
  transformers: Array<Transformer>
}) {
  const [editor] = useLexicalComposerContext()
  const [isMarkdownMode, setIsMarkdownMode] = useState(false)
  const [originalState, setOriginalState] = useState<any>(null)

  const handleMarkdownToggle = useCallback(() => {
    editor.update(() => {
      const root = $getRoot()
      
      if (isMarkdownMode) {
        // Convert from markdown to rich text - restore original state
        if (originalState) {
          root.clear()
          const restoredState = editor.parseEditorState(JSON.stringify(originalState))
          editor.setEditorState(restoredState)
          setOriginalState(null)
        } else {
          // Fallback to markdown conversion
          const firstChild = root.getFirstChild()
          if ($isCodeNode(firstChild) && firstChild.getLanguage() === "markdown") {
            const markdownContent = firstChild.getTextContent()
            root.clear()
            $convertFromMarkdownString(
              markdownContent,
              transformers,
              root,
              shouldPreserveNewLinesInMarkdown
            )
          }
        }
        setIsMarkdownMode(false)
      } else {
        // Convert from rich text to markdown - preserve original content
        const markdown = $convertToMarkdownString(
          transformers,
          root,
          shouldPreserveNewLinesInMarkdown
        )
        
        // Store original state for restoration
        const currentState = editor.getEditorState().toJSON()
        setOriginalState(currentState)
        
        root.clear()
        const codeNode = $createCodeNode("markdown")
        codeNode.append($createTextNode(markdown))
        root.append(codeNode)
        setIsMarkdownMode(true)
      }
    })
  }, [editor, isMarkdownMode, transformers, shouldPreserveNewLinesInMarkdown])

  // Handle CSS styling for markdown mode
  useEffect(() => {
    const editorContainer = document.querySelector('[data-lexical-editor]')?.closest('.bg-background') as HTMLElement
    
    if (editorContainer) {
      if (isMarkdownMode) {
        editorContainer.classList.add('markdown-mode')
      } else {
        editorContainer.classList.remove('markdown-mode')
      }
    }
  }, [isMarkdownMode])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isMarkdownMode ? "default" : "ghost"}
          onClick={handleMarkdownToggle}
          title={isMarkdownMode ? "Switch to Rich Text" : "Switch to Markdown"}
          aria-label={isMarkdownMode ? "Switch to Rich Text" : "Switch to Markdown"}
          size={"sm"}
          className="p-2"
        >
          {isMarkdownMode ? (
            <TypeIcon className="size-4" />
          ) : (
            <FileTextIcon className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isMarkdownMode ? "Switch to Rich Text" : "Switch to Markdown"}
      </TooltipContent>
    </Tooltip>
  )
} 