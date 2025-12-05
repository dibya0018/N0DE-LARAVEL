"use client"

import { useCallback, useState, useEffect } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
} from "@lexical/selection"
import { $getSelection, $isRangeSelection, BaseSelection, COMMAND_PRIORITY_CRITICAL, SELECTION_CHANGE_COMMAND } from "lexical"
import { Baseline } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import ColorPicker from "@/components/editor/editor-ui/colorpicker"

export function TextColorPlugin() {
  const [editor] = useLexicalComposerContext()
  const [fontColor, setFontColor] = useState("#000")

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      const currentColor = $getSelectionStyleValueForProperty(selection, "color", "#000")
      setFontColor(currentColor)
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

  const applyStyleText = useCallback(
    (styles: Record<string, string>, skipHistoryStack?: boolean) => {
      editor.update(
        () => {
          const selection = $getSelection()
          if (selection !== null) {
            $patchStyleText(selection, styles)
          }
        },
        skipHistoryStack ? { tag: "historic" } : {}
      )
    },
    [editor]
  )

  const onFontColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean) => {
      applyStyleText({ color: value }, skipHistoryStack)
      setFontColor(value)
    },
    [applyStyleText]
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ColorPicker
          icon={<Baseline className="size-4" />}
          color={fontColor}
          onChange={onFontColorSelect}
          title="text color"
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>Text Color</p>
      </TooltipContent>
    </Tooltip>
  )
} 