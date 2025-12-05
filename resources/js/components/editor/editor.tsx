"use client"

import {
	InitialConfigType,
	LexicalComposer,
} from "@lexical/react/LexicalComposer"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { EditorState, SerializedLexicalNode } from "lexical"

import { useEffect, useRef, useMemo } from 'react'

import { editorTheme } from "@/components/editor/themes/editor-theme"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FloatingLinkContext } from "@/components/editor/context/floating-link-context"

import { nodes } from "./nodes"
import { Plugins } from "./plugins"
import { $generateNodesFromDOM, $generateHtmlFromNodes } from '@lexical/html'
import { $createParagraphNode, $createTextNode, $getRoot, $insertNodes } from "lexical"

// Plugin to initialize content after editor is ready
function ContentInitializationPlugin({ 
	parsedJsonContent,
	htmlContent,
	onConversionComplete
}: { 
	parsedJsonContent: any
	htmlContent?: string
	onConversionComplete?: () => void
}) {
	const [editor] = useLexicalComposerContext()
	const contentSetRef = useRef(false)

	useEffect(() => {
		if (!contentSetRef.current) {
			// Use a small delay to ensure editor is ready
			const timeoutId = setTimeout(() => {
				if (parsedJsonContent) {
					// New format: JSON content
					editor.setEditorState(editor.parseEditorState(JSON.stringify(parsedJsonContent)))
					contentSetRef.current = true
				} else if (htmlContent && htmlContent.trim() !== '') {
					// Old format: HTML content - convert to Lexical JSON using Lexical's built-in parser
					editor.update(() => {
						const root = $getRoot()
						root.clear()
						
						try {
							// Parse HTML string to DOM using native DOMParser
							const parser = new DOMParser()
							const dom = parser.parseFromString(htmlContent, 'text/html')
							
							// Generate Lexical nodes from DOM using Lexical's official API
							const nodes = $generateNodesFromDOM(editor, dom)
							
							// Select the root and insert nodes
							$getRoot().select()
							$insertNodes(nodes)
							
							contentSetRef.current = true
							
							// Notify parent that conversion is complete
							onConversionComplete?.()
						} catch (error) {
							console.error('Error converting HTML to Lexical:', error)
							// Fallback to empty paragraph
							const paragraph = $createParagraphNode()
							paragraph.append($createTextNode(''))
							root.append(paragraph)
							contentSetRef.current = true
						}
					})
				} else {
					// No content - create empty editor
					editor.update(() => {
						const root = $getRoot()
						root.clear()
						const paragraph = $createParagraphNode()
						paragraph.append($createTextNode(''))
						root.append(paragraph)
						contentSetRef.current = true
					})
				}
			}, 100)
			
			return () => clearTimeout(timeoutId)
		}
	}, [editor, parsedJsonContent, htmlContent, onConversionComplete])

	return null
}

const editorConfig: InitialConfigType = {
	namespace: "Editor",
	theme: editorTheme,
	nodes,
	onError: (error: Error) => {
		console.error(error)
	},
}

export function Editor({
	editorState,
	editorSerializedState,
	jsonContent,
	htmlContent,
	onChange,
	onJsonChange,
	onHtmlChange,
	onConversionComplete,
}: {
	editorState?: EditorState
	editorSerializedState?: SerializedLexicalNode
	jsonContent?: string
	htmlContent?: string
	onChange?: (editorState: EditorState) => void
	onJsonChange?: (json: string) => void
	onHtmlChange?: (html: string) => void
	onConversionComplete?: () => void
}) {
	// Parse jsonContent safely
	const parsedJsonContent = useMemo(() => {
		if (!jsonContent) return null
		
		// If it's already an object, use it directly
		if (typeof jsonContent === 'object') {
			return jsonContent
		}
		
		// If it's a string, try to parse it
		if (typeof jsonContent === 'string' && jsonContent.trim() !== '') {
			try {
				const parsed = JSON.parse(jsonContent)
				return parsed
			} catch (error) {
				console.error('Failed to parse jsonContent:', error)
				return null
			}
		}
		
		return null
	}, [jsonContent])

	return (
		<div className="bg-background overflow-hidden rounded-md">
			<LexicalComposer
				initialConfig={{
					...editorConfig,
					...(editorState ? { editorState } : {}),
					...(editorSerializedState
						? { editorState: JSON.stringify(editorSerializedState) }
						: {}),
				}}
			>
				<TooltipProvider>
					<FloatingLinkContext>
						<Plugins />
						
						{/* Initialize content after editor is ready */}
						<ContentInitializationPlugin 
							parsedJsonContent={parsedJsonContent}
							htmlContent={htmlContent}
							onConversionComplete={onConversionComplete}
						/>

						<OnChangePlugin
							ignoreSelectionChange={true}
							onChange={(editorState, editor) => {
								onChange?.(editorState)
								if (editor) {
									editor.read(() => {
										// Output JSON format
										const json = JSON.stringify(editorState.toJSON())
										onJsonChange?.(json)
										// Output HTML format
										try {
											const html = $generateHtmlFromNodes(editor)
											onHtmlChange?.(html)
										} catch (e) {}
									})
								}
							}}
						/>
					</FloatingLinkContext>
				</TooltipProvider>
			</LexicalComposer>
		</div>
	)
}

