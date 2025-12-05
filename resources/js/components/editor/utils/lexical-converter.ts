/**
 * Utility functions for converting between Lexical JSON and other formats
 */

/**
 * Extract plain text from Lexical JSON
 */
export const extractTextFromLexical = (lexicalJson: any): string => {
    if (!lexicalJson || !lexicalJson.root || !lexicalJson.root.children) {
        return '';
    }
    
    let text = '';
    
    const processNode = (node: any) => {
        if (node.type === 'text') {
            text += node.text || '';
        } else if (node.children) {
            node.children.forEach(processNode);
        }
    };
    
    lexicalJson.root.children.forEach(processNode);
    return text;
};

/**
 * Convert Lexical JSON to HTML (matches backend logic)
 */
export const convertLexicalToHtml = (lexicalJson: any): string => {
    if (!lexicalJson || !lexicalJson.root || !lexicalJson.root.children) {
        return '';
    }
    
    let html = '';
    
    const convertNode = (node: any): string => {
        if (!node.type) return '';
        
        switch (node.type) {
            case 'paragraph':
                const pContent = node.children ? node.children.map(convertNode).join('') : '';
                return `<p>${pContent}</p>`;
                
            case 'heading':
                const level = node.tag || 'h1';
                const hContent = node.children ? node.children.map(convertNode).join('') : '';
                return `<${level}>${hContent}</${level}>`;
                
            case 'list':
                const listType = node.listType || 'ul';
                const listContent = node.children ? node.children.map(convertNode).join('') : '';
                return `<${listType}>${listContent}</${listType}>`;
                
            case 'listitem':
                const liContent = node.children ? node.children.map(convertNode).join('') : '';
                return `<li>${liContent}</li>`;
                
            case 'text':
                let text = node.text || '';
                const format = node.format || 0;
                
                // Apply text formatting (same as backend)
                if (format & 1) text = `<strong>${text}</strong>`; // BOLD
                if (format & 2) text = `<em>${text}</em>`; // ITALIC
                if (format & 4) text = `<u>${text}</u>`; // UNDERLINE
                if (format & 8) text = `<s>${text}</s>`; // STRIKETHROUGH
                if (format & 16) text = `<code>${text}</code>`; // CODE
                
                return text;
                
            case 'link':
                const url = node.url || '';
                const linkContent = node.children ? node.children.map(convertNode).join('') : '';
                return `<a href="${url}">${linkContent}</a>`;
                
            case 'image':
                const src = node.src || '';
                const altText = node.altText || '';
                return `<img src="${src}" alt="${altText}" />`;
                
            case 'quote':
                const quoteContent = node.children ? node.children.map(convertNode).join('') : '';
                return `<blockquote>${quoteContent}</blockquote>`;
                
            case 'code':
                const language = node.language || '';
                const codeContent = node.text || '';
                return `<pre><code class="language-${language}">${codeContent}</code></pre>`;
                
            case 'horizontalrule':
                return '<hr />';
                
            default:
                // For unknown node types, try to convert children
                return node.children ? node.children.map(convertNode).join('') : '';
        }
    };
    
    lexicalJson.root.children.forEach((node: any) => {
        html += convertNode(node);
    });
    
    return html;
};

/**
 * Render rich text content for display (handles both HTML and JSON)
 */
export const renderRichTextContent = (content: any): string => {
    if (!content) return '';
    
    // If it's already HTML, return as is
    if (typeof content === 'string' && !content.trim().startsWith('{') && !content.trim().startsWith('[')) {
        return content;
    }
    
    // If it's JSON (string or object), convert to HTML
    let jsonContent = content;
    if (typeof content === 'string') {
        try {
            jsonContent = JSON.parse(content);
        } catch (e) {
            // Not valid JSON, return as is
            return content;
        }
    }
    
    if (jsonContent && jsonContent.root && jsonContent.root.children) {
        // Convert Lexical JSON to HTML using the same logic as the backend
        return convertLexicalToHtml(jsonContent);
    }
    
    return String(content);
};

/**
 * Get plain text from rich text content (for display in tables/lists)
 */
export const getRichTextPlainText = (content: any): string => {
    if (!content) return '';
    
    // If it's already HTML, strip tags
    if (typeof content === 'string' && !content.trim().startsWith('{') && !content.trim().startsWith('[')) {
        return content.replace(/<[^>]*>/g, '');
    }
    
    // If it's JSON (string or object), extract text
    let jsonContent = content;
    if (typeof content === 'string') {
        try {
            jsonContent = JSON.parse(content);
        } catch (e) {
            // Not valid JSON, return as is
            return content;
        }
    }
    
    if (jsonContent && jsonContent.root && jsonContent.root.children) {
        return extractTextFromLexical(jsonContent);
    }
    
    return String(content);
}; 