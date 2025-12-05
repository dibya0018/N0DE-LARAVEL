import { useState } from "react"
import {
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
} from "@lexical/markdown"
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin"
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin"
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HashtagPlugin } from "@lexical/react/LexicalHashtagPlugin"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin"
import { TablePlugin } from "@lexical/react/LexicalTablePlugin"

import { ContentEditable } from "@/components/editor/editor-ui/content-editable"
import { BasicToolbar } from "@/components/editor/plugins/toolbar/basic-toolbar"
import { ImagesPlugin } from "./plugins/images-plugin"
import { TableActionMenuPlugin } from "./plugins/table-action-menu-plugin"
import { TableHoverActionsPlugin } from "./plugins/table-hover-actions-plugin"
import { TableCellResizerPlugin } from "./plugins/table-cell-resizer-plugin"
import { TreeViewPlugin } from "./plugins/tree-view-plugin"
import { CounterCharacterPlugin } from "./plugins/counter-character-plugin"
import { MarkdownTogglePlugin } from "./plugins/markdown-toggle-plugin"
import { DraggableBlockPlugin } from "./plugins/draggable-block-plugin"
import { FloatingTextFormatToolbarPlugin } from "./plugins/floating-text-format-plugin"

export function Plugins() {
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null)

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem)
    }
  }

  return (
    <div className="relative">
      <BasicToolbar />
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <div className="">
              <div className="" ref={onRef}>
                <ContentEditable
                  placeholder="Start typing..."
                  className="ContentEditable__root relative block min-h-72 max-h-96 overflow-auto px-8 py-4 focus:outline-none"
                />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />

        <ClickableLinkPlugin />
        <CheckListPlugin />
        <HorizontalRulePlugin />
        <TablePlugin />
        <ListPlugin />
        <TabIndentationPlugin />
        <HashtagPlugin />
        <HistoryPlugin />
        <ImagesPlugin />
        <TableActionMenuPlugin anchorElem={floatingAnchorElem} cellMerge={true} />
        <TableHoverActionsPlugin anchorElem={floatingAnchorElem} />
        <TableCellResizerPlugin />
        
        {/* Draggable block plugin for reordering blocks */}
        <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
        
        {/* Floating text format toolbar for text formatting */}
        <FloatingTextFormatToolbarPlugin anchorElem={floatingAnchorElem} />

        <MarkdownShortcutPlugin
          transformers={[
            CHECK_LIST,
            ...ELEMENT_TRANSFORMERS,
            ...MULTILINE_ELEMENT_TRANSFORMERS,
            ...TEXT_FORMAT_TRANSFORMERS,
            ...TEXT_MATCH_TRANSFORMERS,
          ]}
        />
        
        {/* Character counter at the bottom */}
        <div className="flex justify-end p-2 border-t bg-gray-50 dark:bg-gray-800">
          <CounterCharacterPlugin />
        </div>
      </div>
    </div>
  )
}
