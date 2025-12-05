import { useState } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { $getRoot, $insertNodes } from 'lexical'
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { SquareCode, Save, X, AlignLeft } from "lucide-react"
import { formatHTML } from "@/components/editor/utils/html-formatter"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function SourceCodeToolbarPlugin() {
	const [editor] = useLexicalComposerContext()
	const [isSourceModalOpen, setIsSourceModalOpen] = useState(false)
	const [sourceCode, setSourceCode] = useState("")
	const [isEditing, setIsEditing] = useState(false)

	const openSourceModal = () => {
		editor.read(() => {
			const html = $generateHtmlFromNodes(editor)
			// Format the HTML for better readability
			const formatted = formatHTML(html)
			setSourceCode(formatted)
			setIsSourceModalOpen(true)
		})
	}

	const applySourceCode = () => {
		editor.update(() => {
			const root = $getRoot()
			root.clear()

			if (sourceCode.trim() === '') {
				// If source code is empty, create an empty paragraph
				const { $createParagraphNode, $createTextNode } = require('lexical')
				const paragraph = $createParagraphNode()
				paragraph.append($createTextNode(''))
				root.append(paragraph)
			} else {
				// In the browser you can use the native DOMParser API to parse the HTML string.
				const parser = new DOMParser()
				const dom = parser.parseFromString(sourceCode, 'text/html')

				// Once you have the DOM instance it's easy to generate LexicalNodes.
				const nodes = $generateNodesFromDOM(editor, dom)

				// Select the root
				$getRoot().select()

				// Insert them at a selection.
				$insertNodes(nodes)
			}
		})

		setIsSourceModalOpen(false)
		setIsEditing(false)
	}

	const handleSourceCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setSourceCode(e.target.value)
		setIsEditing(true)
	}

	const closeModal = () => {
		setIsSourceModalOpen(false)
		setIsEditing(false)
		setSourceCode("")
	}

	const formatSourceCode = () => {
		try {
			const formatted = formatHTML(sourceCode)
			setSourceCode(formatted)
			setIsEditing(true)
		} catch (error) {
			console.error('Error formatting HTML:', error)
		}
	}

	return (
		<>
			<Separator orientation="vertical" className="h-6" />

			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						onClick={openSourceModal}
						className="h-8 w-8 p-0"
					>
						<SquareCode className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Edit Source Code</p>
				</TooltipContent>
			</Tooltip>

			<Dialog open={isSourceModalOpen} onOpenChange={setIsSourceModalOpen}>
				<DialogContent className="sm:max-w-4xl max-h-[95vh] flex flex-col">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<SquareCode className="h-5 w-5" />
							Edit Source Code
						</DialogTitle>
						<DialogDescription>
							View and edit the HTML source code of your content. Changes will be applied when you save.
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 flex flex-col space-y-4 min-h-0">
						<div className="flex flex-col space-y-2 flex-1 min-h-0">
							<div className="flex items-center justify-between">
								<label htmlFor="source-code" className="text-sm font-medium">
									HTML Source Code
								</label>
								<Button
									variant="outline"
									size="sm"
									onClick={formatSourceCode}
									className="h-8 px-3"
								>
									<AlignLeft className="mr-2 h-4 w-4" />
									Format
								</Button>
							</div>
							<Textarea
								id="source-code"
								value={sourceCode}
								onChange={handleSourceCodeChange}
								placeholder="Enter HTML source code..."
								className="font-mono text-sm flex-1 min-h-[200px] max-h-none overflow-y-auto resize-none"
								spellCheck={false}
								style={{
									height: 'auto',
									minHeight: '200px'
								}}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={closeModal}>
							<X className="mr-2 h-4 w-4" />
							Cancel
						</Button>
						<Button onClick={applySourceCode} disabled={!isEditing}>
							<Save className="mr-2 h-4 w-4" />
							Apply Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
} 