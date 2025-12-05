"use client"

import { useCallback, useState, useEffect } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
} from "@lexical/selection"
import { $getSelection, $isRangeSelection, BaseSelection, COMMAND_PRIORITY_CRITICAL, SELECTION_CHANGE_COMMAND } from "lexical"
import { PaintBucket } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import ColorPicker from "@/components/editor/editor-ui/colorpicker"

export function BackgroundColorPlugin() {
  const [editor] = useLexicalComposerContext()
  const [bgColor, setBgColor] = useState("#fff")

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      const currentBgColor = $getSelectionStyleValueForProperty(selection, "background-color", "#fff")
      setBgColor(currentBgColor)
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

  const onBgColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean) => {
      applyStyleText({ "background-color": value }, skipHistoryStack)
      setBgColor(value)
    },
    [applyStyleText]
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ColorPicker
          icon={<PaintBucket className="size-4" />}
          color={bgColor}
          onChange={onBgColorSelect}
          title="text background color"
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>Background Color</p>
      </TooltipContent>
    </Tooltip>
  )
} 