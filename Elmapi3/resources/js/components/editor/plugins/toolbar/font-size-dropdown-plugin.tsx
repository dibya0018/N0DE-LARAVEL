"use client"

import { useCallback, useState, useEffect } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
} from "@lexical/selection"
import { $getSelection, $isRangeSelection, BaseSelection, COMMAND_PRIORITY_CRITICAL, SELECTION_CHANGE_COMMAND } from "lexical"
import { 
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

const FONT_SIZE_OPTIONS = [
  { value: "8px", label: "8" },
  { value: "10px", label: "10" },
  { value: "12px", label: "12" },
  { value: "14px", label: "14" },
  { value: "16px", label: "16" },
  { value: "18px", label: "18" },
  { value: "20px", label: "20" },
  { value: "24px", label: "24" },
  { value: "28px", label: "28" },
  { value: "32px", label: "32" },
  { value: "36px", label: "36" },
  { value: "48px", label: "48" },
]

export function FontSizeDropdownPlugin() {
  const [editor] = useLexicalComposerContext()
  const [fontSize, setFontSize] = useState("16px")

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      // Update font size
      const currentFontSize = $getSelectionStyleValueForProperty(selection, "font-size", "16px")
      setFontSize(currentFontSize)
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

  const handleFontSizeChange = useCallback(
    (size: string) => {
      editor.update(() => {
        const selection = $getSelection()
        if (selection !== null) {
          $patchStyleText(selection, {
            "font-size": size,
          })
        }
      })
      setFontSize(size)
    },
    [editor]
  )

  const getCurrentFontSizeLabel = () => {
    const option = FONT_SIZE_OPTIONS.find(opt => opt.value === fontSize)
    return option ? option.label : fontSize.replace('px', '')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Type className="h-4 w-4" />
          <span className="text-xs">
            {getCurrentFontSizeLabel()}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-32" align="start">
        <DropdownMenuLabel>Font Size</DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-1 p-2">
          {FONT_SIZE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={fontSize === option.value ? "default" : "ghost"}
              size="sm"
              onClick={() => handleFontSizeChange(option.value)}
              className="h-8 text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 