import { JSX, useCallback, useMemo, useState } from "react"
import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export function useEditorModal(): [
  JSX.Element | null,
  (title: string, showModal: (onClose: () => void) => JSX.Element) => void,
] {
  const [modalContent, setModalContent] = useState<null | {
    closeOnClickOutside: boolean
    content: JSX.Element
    title: string
  }>(null)

  const onClose = useCallback(() => {
    setModalContent(null)
  }, [])

  const modal = useMemo(() => {
    if (modalContent === null) {
      return null
    }
    const { title, content } = modalContent
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {title === "Insert Image" && "Add an image to your content by entering a URL."}
              {title === "Insert Inline Image" && "Upload an image file to insert into your content."}
              {title === "Insert Link" && "Add a link to your content."}
              {title === "Edit Link" && "Modify the link properties."}
              {title === "Insert Table" && "Create a new table with the specified number of rows and columns."}
              {title === "Edit Source Code" && "View and edit the HTML source code of your content."}
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }, [modalContent, onClose])

  const showModal = useCallback(
    (
      title: string,
      getContent: (onClose: () => void) => JSX.Element,
      closeOnClickOutside = false
    ) => {
      setModalContent({
        closeOnClickOutside,
        content: getContent(onClose),
        title,
      })
    },
    [onClose]
  )

  return [modal, showModal]
}
