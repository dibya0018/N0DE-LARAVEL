// HTML formatting utility for better readability
export function formatHTML(html: string): string {
  if (!html || html.trim() === '') {
    return ''
  }

  // Create a temporary div to parse the HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  // Function to format the HTML with proper indentation
  function formatElement(element: Element, indent: number = 0): string {
    const spaces = '  '.repeat(indent) // 2 spaces per indent level
    const tagName = element.tagName.toLowerCase()
    
    // Handle self-closing tags
    const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link']
    if (selfClosingTags.includes(tagName)) {
      return `${spaces}<${tagName}${formatAttributes(element)} />`
    }

    // Handle text-only elements
    if (element.children.length === 0) {
      const textContent = element.textContent?.trim()
      if (textContent) {
        return `${spaces}<${tagName}${formatAttributes(element)}>${textContent}</${tagName}>`
      } else {
        return `${spaces}<${tagName}${formatAttributes(element)}></${tagName}>`
      }
    }

    // Handle elements with children
    let result = `${spaces}<${tagName}${formatAttributes(element)}>\n`
    
    // Process child nodes
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i]
      
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim()
        if (text) {
          result += `${spaces}  ${text}\n`
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        result += formatElement(child as Element, indent + 1) + '\n'
      }
    }
    
    result += `${spaces}</${tagName}>`
    return result
  }

  // Function to format element attributes
  function formatAttributes(element: Element): string {
    const attributes: string[] = []
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i]
      attributes.push(`${attr.name}="${attr.value}"`)
    }
    return attributes.length > 0 ? ' ' + attributes.join(' ') : ''
  }

  // Format all top-level elements
  let formattedHTML = ''
  for (let i = 0; i < tempDiv.children.length; i++) {
    const child = tempDiv.children[i]
    formattedHTML += formatElement(child) + '\n'
  }

  // If no children, try to format the innerHTML directly
  if (formattedHTML.trim() === '') {
    // Create a temporary container to parse the HTML properly
    const container = document.createElement('div')
    container.innerHTML = html
    
    // If it's just text content, return it as is
    if (container.children.length === 0 && container.textContent) {
      return container.textContent
    }
    
    // Otherwise, format the children
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i]
      formattedHTML += formatElement(child) + '\n'
    }
  }

  return formattedHTML.trim()
}

// Alternative simpler formatting for basic cases
export function simpleFormatHTML(html: string): string {
  if (!html || html.trim() === '') {
    return ''
  }

  // Basic formatting using regex
  let formatted = html
    .replace(/></g, '>\n<') // Add newlines between tags
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim()

  // Add basic indentation
  const lines = formatted.split('\n')
  let indentLevel = 0
  const indentSize = 2

  const formattedLines = lines.map(line => {
    const trimmed = line.trim()
    
    // Decrease indent for closing tags
    if (trimmed.startsWith('</')) {
      indentLevel = Math.max(0, indentLevel - 1)
    }
    
    const indent = ' '.repeat(indentLevel * indentSize)
    const result = indent + trimmed
    
    // Increase indent for opening tags (but not self-closing)
    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
      indentLevel++
    }
    
    return result
  })

  return formattedLines.join('\n')
} 