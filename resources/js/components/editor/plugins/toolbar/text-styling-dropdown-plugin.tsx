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

const FONT_FAMILY_OPTIONS = [
  { value: "Arial", label: "Arial" },
  { value: "Verdana", label: "Verdana" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Courier New", label: "Courier New" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Comic Sans MS", label: "Comic Sans MS" },
]

export function TextStylingDropdownPlugin() {
  const [editor] = useLexicalComposerContext()
  const [fontFamily, setFontFamily] = useState("Arial")

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      // Update font family
      const currentFontFamily = $getSelectionStyleValueForProperty(selection, "font-family", "Arial")
      setFontFamily(currentFontFamily)
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

  const handleFontFamilyChange = useCallback(
    (family: string) => {
      editor.update(() => {
        const selection = $getSelection()
        if (selection !== null) {
          $patchStyleText(selection, {
            "font-family": family,
          })
        }
      })
      setFontFamily(family)
    },
    [editor]
  )

  const getCurrentFontFamilyLabel = () => {
    const option = FONT_FAMILY_OPTIONS.find(opt => opt.value === fontFamily)
    return option ? option.label : fontFamily
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Type className="h-4 w-4" />
          <span className="text-xs">
            {getCurrentFontFamilyLabel()}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="start">
        <DropdownMenuLabel>Font Family</DropdownMenuLabel>
        {FONT_FAMILY_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleFontFamilyChange(option.value)}
            className={fontFamily === option.value ? "bg-accent" : ""}
          >
            <span style={{ fontFamily: option.value }}>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 