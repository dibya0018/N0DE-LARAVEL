import { useState, useEffect } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function FullscreenPlugin() {
  const [editor] = useLexicalComposerContext()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when in fullscreen
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

  // Apply fullscreen styles to the editor container
  useEffect(() => {
    const editorContainer = document.querySelector('[data-lexical-editor]')?.closest('.bg-background') as HTMLElement
    const contentEditable = document.querySelector('.ContentEditable__root') as HTMLElement
    
    if (editorContainer) {
      if (isFullscreen) {
        editorContainer.classList.add('fixed', 'inset-0', 'z-[9999]', 'bg-background', 'flex', 'flex-col')
        editorContainer.style.position = 'fixed'
        editorContainer.style.top = '0'
        editorContainer.style.left = '0'
        editorContainer.style.right = '0'
        editorContainer.style.bottom = '0'
        editorContainer.style.zIndex = '9999'
        editorContainer.style.backgroundColor = 'var(--background)'
        
        // Ensure the content area is scrollable
        if (contentEditable) {
          contentEditable.style.overflow = 'auto'
          contentEditable.style.maxHeight = 'calc(100vh - 120px)' // Account for toolbar height
          contentEditable.style.flex = '1'
        }
      } else {
        editorContainer.classList.remove('fixed', 'inset-0', 'z-[9999]', 'flex', 'flex-col')
        editorContainer.style.position = ''
        editorContainer.style.top = ''
        editorContainer.style.left = ''
        editorContainer.style.right = ''
        editorContainer.style.bottom = ''
        editorContainer.style.zIndex = ''
        editorContainer.style.backgroundColor = ''
        
        // Reset content area styles
        if (contentEditable) {
          contentEditable.style.overflow = ''
          contentEditable.style.maxHeight = ''
          contentEditable.style.flex = ''
        }
      }
    }
  }, [isFullscreen])

  return (
    <>
      <Separator orientation="vertical" className="h-6" />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</p>
        </TooltipContent>
      </Tooltip>
    </>
  )
} 