"use client"

import { useCallback, useState, useEffect } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getSelection, $isRangeSelection, BaseSelection, COMMAND_PRIORITY_CRITICAL, SELECTION_CHANGE_COMMAND } from "lexical"
import { $createHeadingNode, $isHeadingNode } from "@lexical/rich-text"
import { $createTextNode, $createParagraphNode, $getRoot, $getNodeByKey, $isParagraphNode } from "lexical"
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  Heading4, 
  Heading5, 
  Heading6,
  Type,
  ChevronDown
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const HEADING_OPTIONS = [
  { value: "paragraph", label: "Paragraph", icon: Type },
  { value: "h1", label: "Heading 1", icon: Heading1 },
  { value: "h2", label: "Heading 2", icon: Heading2 },
  { value: "h3", label: "Heading 3", icon: Heading3 },
  { value: "h4", label: "Heading 4", icon: Heading4 },
  { value: "h5", label: "Heading 5", icon: Heading5 },
  { value: "h6", label: "Heading 6", icon: Heading6 },
]

export function HeadingsDropdownPlugin() {
  const [editor] = useLexicalComposerContext()
  const [currentBlockType, setCurrentBlockType] = useState("paragraph")

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode()
      const element = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow()
      
      if ($isHeadingNode(element)) {
        const tag = element.getTag()
        setCurrentBlockType(tag)
      } else if ($isParagraphNode(element)) {
        setCurrentBlockType('paragraph')
      } else {
        setCurrentBlockType('paragraph')
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

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar()
        return false
      },
      COMMAND_PRIORITY_CRITICAL
    )
  }, [editor, updateToolbar])

  const insertHeading = useCallback(
    (level: "paragraph" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6") => {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode()
          const element = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow()
          
          // Get the text content from the current element
          const textContent = element.getTextContent()
          
          // Create the new element
          let newNode
          if (level === "paragraph") {
            newNode = $createParagraphNode()
            if (textContent) {
              newNode.append($createTextNode(textContent))
            }
          } else {
            newNode = $createHeadingNode(level)
            if (textContent) {
              newNode.append($createTextNode(textContent))
            }
          }
          
          // Replace the current element with the new one
          element.replace(newNode)
          
          // Select the new node
          newNode.select()
        }
      })
      setCurrentBlockType(level)
    },
    [editor]
  )

  const getCurrentHeadingLabel = () => {
    const option = HEADING_OPTIONS.find(opt => opt.value === currentBlockType)
    return option ? option.label : "Paragraph"
  }

  const getCurrentHeadingIcon = () => {
    const option = HEADING_OPTIONS.find(opt => opt.value === currentBlockType)
    return option ? option.icon : Type
  }

  const CurrentIcon = getCurrentHeadingIcon()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <CurrentIcon className="h-4 w-4" />
          <span className="text-xs">
            {getCurrentHeadingLabel()}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="start">
        <DropdownMenuLabel>Block Type</DropdownMenuLabel>
        {HEADING_OPTIONS.map(({ value, label, icon: Icon }) => {
          const isActive = currentBlockType === value
          return (
            <DropdownMenuItem
              key={value}
              onClick={() => insertHeading(value as any)}
              className={isActive ? "bg-accent" : ""}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 