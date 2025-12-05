import FieldBase, { FieldProps } from './FieldBase';
import { useCallback, useState, useEffect, useRef } from 'react';

import { Editor } from '@/components/editor/editor';

export default function RichTextField({ field, value, onChange, processing, errors }: FieldProps) {
    const [jsonContent, setJsonContent] = useState<string | undefined>(undefined);
    const [htmlContent, setHtmlContent] = useState<string | undefined>(undefined);
    const htmlRef = useRef<string | undefined>(undefined);
    const jsonRef = useRef<any>(null);

    useEffect(() => {
        // Initialize from either {json, html}, raw JSON string, or raw HTML string
        if (value && typeof value === 'object' && 'json' in value) {
            try {
                setJsonContent(JSON.stringify((value as any).json));
                jsonRef.current = (value as any).json;
            } catch {
                setJsonContent(undefined);
                jsonRef.current = null;
            }
            const initialHtml = (value as any).html as string | undefined;
            setHtmlContent(initialHtml);
            htmlRef.current = initialHtml;
            return;
        }
        if (typeof value === 'string' && value.trim() !== '') {
            const trimmed = value.trim();
            const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
            if (looksLikeJson) {
                setJsonContent(value);
                htmlRef.current = undefined;
                jsonRef.current = (() => { try { return JSON.parse(value); } catch { return null; } })();
                setHtmlContent(undefined);
            } else {
                setJsonContent(undefined);
                jsonRef.current = null;
                setHtmlContent(value);
                htmlRef.current = value;
            }
        } else {
            setJsonContent(undefined);
            setHtmlContent(undefined);
            htmlRef.current = undefined;
            jsonRef.current = null;
        }
    }, [value]);

    const emitCombinedChange = useCallback(() => {
        onChange(field, { json: jsonRef.current, html: htmlRef.current });
    }, [field, onChange]);

    const handleJsonChange = useCallback((json: string) => {
        let parsed: any = null;
        try {
            parsed = JSON.parse(json);
        } catch {
            parsed = null;
        }
        jsonRef.current = parsed;
        emitCombinedChange();
    }, [emitCombinedChange]);

    const handleHtmlChange = useCallback((html: string) => {
        setHtmlContent(html);
        htmlRef.current = html;
        emitCombinedChange();
    }, [emitCombinedChange]);

    return (
        <FieldBase field={field} value={value} onChange={onChange} processing={processing} errors={errors}>
            <div className="rounded-md border border-input">
                <Editor 
                    key={`editor-${field.id}`}
                    jsonContent={jsonContent}
                    htmlContent={htmlContent}
                    onJsonChange={handleJsonChange}
                    onHtmlChange={handleHtmlChange}
                />
            </div>
        </FieldBase>
    );
} 