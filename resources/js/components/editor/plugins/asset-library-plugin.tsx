import { useState, useCallback } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getSelection, $isRangeSelection, $createTextNode, $createParagraphNode, $insertNodes, $isRootOrShadowRoot } from "lexical"
import { Image, ImagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MediaLibraryModal } from "@/pages/Assets/MediaFieldSelectModal"
import { usePage } from '@inertiajs/react'
import { PageProps as InertiaPageProps } from '@inertiajs/core'
import type { Project, Asset } from '@/types'
import { $createImageNode } from "../nodes/image-node"
import { INSERT_IMAGE_COMMAND } from "./images-plugin"
import { useEditorModal } from "@/components/editor/editor-hooks/use-modal"
import { InsertImageDialog } from "./images-plugin"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export function AssetLibraryPlugin() {
  const [editor] = useLexicalComposerContext()
  const [isAssetModalOpen, setAssetModalOpen] = useState(false)
  const [modal, showModal] = useEditorModal()

  // Access current project from Inertia page props
  interface PageProps extends InertiaPageProps {
    project: Project;
  }
  const { project } = usePage<PageProps>().props

  const handleInsertAssets = useCallback((assets: Asset[]) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        assets.forEach((asset) => {
          const altText = asset.metadata?.alt_text || asset.original_filename
          
          // Check if asset is an image based on extension
          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(asset.extension.toLowerCase())
          
          if (isImage) {
            // For images, insert as a proper image node with resize functionality
            const imageNode = $createImageNode({
              altText,
              src: asset.full_url || asset.url,
              maxWidth: 500,
            })
            $insertNodes([imageNode])
            if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
              const paragraphNode = $createParagraphNode()
              paragraphNode.append(imageNode)
              selection.insertNodes([paragraphNode])
            }
          } else {
            // For non-images, insert as a link with file info
            const linkText = asset.original_filename
            const textNode = $createTextNode(linkText)
            textNode.setFormat('underline')
            selection.insertNodes([textNode])
            
            // Add file size info
            const noteNode = $createTextNode(` (${asset.formatted_size})`)
            selection.insertNodes([noteNode])
          }
        })
      }
    })

    setAssetModalOpen(false)
  }, [editor])

  const handleInsertImageFromUrl = useCallback((payload: { altText: string; src: string }) => {
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
      ...payload,
      maxWidth: 500,
    })
  }, [editor])

  const openAssetModal = () => {
    setAssetModalOpen(true)
  }

  const openImageDialog = () => {
    showModal("Insert Image", (onClose) => (
      <InsertImageDialog
        activeEditor={editor}
        onClose={onClose}
      />
    ))
  }

  return (
    <>
      <Separator orientation="vertical" className="h-6" />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={openAssetModal}
            className="h-8 w-8 p-0"
          >
            <Image className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Insert from Asset Library</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={openImageDialog}
            className="h-8 w-8 p-0"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Insert Image from URL</p>
        </TooltipContent>
      </Tooltip>

      {/* Asset Library Modal */}
      {project && (
        <MediaLibraryModal
          isOpen={isAssetModalOpen}
          onClose={() => setAssetModalOpen(false)}
          project={project}
          onSelect={handleInsertAssets}
          currentlySelected={[]}
          allowMultiple={false}
        />
      )}

      {modal}
    </>
  )
} 