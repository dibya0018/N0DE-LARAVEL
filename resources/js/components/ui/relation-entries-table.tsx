import React from 'react';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import type { Field, ContentEntry } from '@/types';
import { getRichTextPlainText } from '@/components/editor/utils/lexical-converter';

interface RelationEntriesTableProps {
    /** Field definitions to display (already filtered for visibility) */
    fields: Field[];
    /** Entries to render */
    entries: ContentEntry[];
    /** Show the status column */
    showStatus?: boolean;
    /** Show the created at column */
    showCreated?: boolean;
    /** Called when entries reordered via drag-and-drop */
    onOrderChange?: (entries: ContentEntry[]) => void;
}

/**
 * Lightweight read-only table for rendering related content entries.
 *
 * The component mirrors the display logic of ContentList / DataTable so we
 * don't repeat rendering code in multiple places (ContentList relation dialog
 * and RelationField preview table).
 */
export default function RelationEntriesTable({
    fields,
    entries,
    showStatus = true,
    showCreated = true,
    onOrderChange,
}: RelationEntriesTableProps) {
    const [internalEntries, setInternalEntries] = React.useState(entries);

    React.useEffect(() => {
        setInternalEntries(entries);
    }, [entries]);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(internalEntries);
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, moved);
        setInternalEntries(items);
        if (onOrderChange) onOrderChange(items);
    };

    const sortingEnabled = !showStatus || !showCreated;

    const alwaysHandleDragEnd = (result: DropResult) => {
        if (!sortingEnabled) return;
        handleDragEnd(result);
    };

    /** Render a single field value similar to ContentList logic */
    const renderFieldValue = (field: Field, value: any) => {
        if (value === null || value === undefined || value === '') return '-';

        // Handle repeatable fields (arrays) - check if it's an array of objects
        if (field.options?.repeatable && Array.isArray(value)) {
            if (value.length === 0) return '-';
            const first = value[0];
            // If it's an array of objects (like group fields), show count
            if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
                return `${value.length} item${value.length === 1 ? '' : 's'}`;
            }
            // Otherwise, handle as simple array
            if (typeof first !== 'object') {
                return `${first}${value.length > 1 ? ` (+${value.length - 1} more)` : ''}`;
            }
        }

        switch (field.type) {
            case 'text':
            case 'longtext':
                return typeof value === 'string' && value.length > 30
                    ? `${value.substring(0, 30)}...`
                    : value;
            case 'email':
            case 'slug':
                return value;
            case 'richtext': {
                // Use the utility function to get plain text
                const plain = getRichTextPlainText(value);
                return plain.length > 30 ? `${plain.substring(0, 30)}...` : plain;
            }
            case 'date': {
                const format = 'YYYY-MM-DD' + (field.options?.includeTime ? ' HH:mm' : '');
                if (field.options?.mode === 'range' && typeof value === 'string') {
                    return value.split(' - ').map((d: any) => moment.parseZone(d).format(format)).join(' / ');
                }
                return moment.parseZone(value).format(format);
            }
            case 'boolean':
                return value ? 'Yes' : 'No';
            case 'enumeration':
                if (Array.isArray(value)) return value.join(', ');
                if (typeof value === 'string') {
                    try {
                        const parsed = JSON.parse(value);
                        if (Array.isArray(parsed)) return parsed.join(', ');
                    } catch {/* ignore */}
                }
                return value;
            case 'number':
                return value === null ? '-' : Number(value).toString();
            case 'media':
                if (!value) return '-';
                if (Array.isArray(value)) {
                    return (
                        <div className="flex flex-wrap gap-1">
                            {value.map((asset: any, index: number) => (
                                <div key={index} className="w-8 h-8">
                                    {asset.thumbnail_url ? (
                                        <img
                                            src={asset.thumbnail_url}
                                            alt=""
                                            className="w-full h-full object-cover rounded"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted rounded">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                }
                return '-';
            case 'relation':
                if (Array.isArray(value)) return `${value.length} relation${value.length === 1 ? '' : 's'}`;
                return value ? '1 relation' : '-';
            case 'group':
                // Group fields are arrays of objects (instances)
                // For repeatable: [{field1: val1, field2: val2}, ...]
                // For non-repeatable: [{field1: val1, field2: val2}] or {field1: val1, field2: val2}
                const groupData = Array.isArray(value) ? value : (value ? [value] : []);
                if (groupData.length > 0) {
                    // Show count for repeatable groups, or indicate group data exists
                    if (field.options?.repeatable) {
                        return `${groupData.length} item${groupData.length === 1 ? '' : 's'}`;
                    } else {
                        // For non-repeatable, try to show first child field value if available
                        const childFields = (field as any).children || [];
                        if (childFields.length > 0 && groupData[0]) {
                            const firstChild = childFields[0];
                            const firstValue = groupData[0][firstChild.name];
                            if (firstValue !== null && firstValue !== undefined && firstValue !== '') {
                                return String(firstValue).length > 30 
                                    ? `${String(firstValue).substring(0, 30)}...` 
                                    : String(firstValue);
                            }
                        }
                        return 'Group data';
                    }
                }
                return '-';
            default:
                // For any other object type, convert to string representation
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    return JSON.stringify(value);
                }
                return value;
        }
    };

    return (
        <div className="overflow-x-auto w-full">
            <DragDropContext onDragEnd={alwaysHandleDragEnd}>
                <table className="min-w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            {showStatus && <th className="px-4 py-2 text-left whitespace-nowrap">Status</th>}
                            {showCreated && <th className="px-4 py-2 text-left whitespace-nowrap">Created</th>}
                            {sortingEnabled && <th className="w-4"></th>}
                            {fields.map((f) => (
                                <th key={f.id} className="px-4 py-2 text-left whitespace-nowrap">
                                    {f.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <Droppable droppableId="relation-entries-table" direction="vertical" isDropDisabled={!sortingEnabled}>
                        {(provided) => (
                            <tbody ref={provided.innerRef} {...provided.droppableProps}>
                                {internalEntries.map((ent, index) => (
                                    <Draggable key={ent.id} draggableId={String(ent.id)} index={index} isDragDisabled={!sortingEnabled}>
                                        {(providedDrag) => (
                                            <tr
                                                ref={providedDrag.innerRef}
                                                {...(sortingEnabled ? providedDrag.draggableProps : {})}
                                                className="border-t hover:bg-muted/20"
                                            >
                                                {showStatus && (
                                                    <td className="px-4 py-2 whitespace-nowrap">
                                                        <Badge
                                                            variant={ent.status === 'published' ? 'default' : ent.status === 'trashed' ? 'destructive' : 'outline'}
                                                            className={
                                                                ent.status === 'published'
                                                                    ? 'bg-green-600 hover:bg-green-700'
                                                                    : ent.status === 'trashed'
                                                                    ? 'bg-red-600 hover:bg-red-700'
                                                                    : 'text-amber-600 border-amber-300'
                                                            }
                                                        >
                                                            {ent.status === 'published' ? 'Published' : ent.status === 'trashed' ? 'Trashed' : 'Draft'}
                                                        </Badge>
                                                    </td>
                                                )}
                                                {showCreated && (
                                                    <td className="px-4 py-2 whitespace-nowrap">
                                                        {new Date(ent.created_at).toLocaleString()}
                                                    </td>
                                                )}
                                                {sortingEnabled && (<td className="px-2 cursor-grab" {...providedDrag.dragHandleProps}>
                                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><circle cx="3" cy="5" r="1.5"/><circle cx="3" cy="10.5" r="1.5"/><circle cx="8" cy="5" r="1.5"/><circle cx="8" cy="10.5" r="1.5"/><circle cx="13" cy="5" r="1.5"/><circle cx="13" cy="10.5" r="1.5"/></svg>
                                                </td>)}
                                                {fields.map((f) => (
                                                    <td key={f.id} className="px-4 py-2 whitespace-nowrap">
                                                        {renderFieldValue(f, (ent as any)[f.name])}
                                                    </td>
                                                ))}
                                            </tr>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                                {internalEntries.length === 0 && (
                                    <tr>
                                        <td
                                            className="px-4 py-6 text-muted-foreground text-center"
                                            colSpan={fields.length + (showStatus ? 1 : 0) + (showCreated ? 1 : 0) + (sortingEnabled ? 1 : 0)}
                                        >
                                            No related entries
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        )}
                    </Droppable>
                </table>
            </DragDropContext>
        </div>
    );
} 