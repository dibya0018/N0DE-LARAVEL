import { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment';

import { Collection, Field, ContentEntry, ColumnDef } from '@/types';
import { getRichTextPlainText } from '@/components/editor/utils/lexical-converter';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    collection: Collection;
    projectId: number;
    locale: string;
    excludeEntryIds?: number[];
    onSelect: (entry: ContentEntry) => void;
}

export default function TranslationSelectModal({ 
    isOpen, 
    onClose, 
    collection, 
    projectId, 
    locale,
    excludeEntryIds = [],
    onSelect 
}: Props) {
    const [selectedItem, setSelectedItem] = useState<ContentEntry | null>(null);
    const searchRoute = `/projects/${projectId}/collections/${collection.id}/content/search?filter_locale=${locale}`;

    useEffect(() => {
        if (isOpen) {
            setSelectedItem(null);
        }
    }, [isOpen]);

    // Generate dynamic columns based on collection fields
    const generateColumns = (): ColumnDef[] => {
        const columns: ColumnDef[] = [
            {
                header: "Status",
                accessorKey: "status",
                sortable: true,
                filter: {
                    type: 'select',
                    options: [
                        { label: 'Draft', value: 'draft' },
                        { label: 'Published', value: 'published' },
                    ]
                },
                cell: (item: ContentEntry) => (
                    <Badge variant={item.status === 'published' ? 'default' : 'outline'} className={
                        item.status === 'published' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'text-amber-600 border-amber-300'
                    }>
                        {item.status === 'published' ? 'Published' : 'Draft'}
                    </Badge>
                ),
            },
            {
                header: "Created",
                accessorKey: "created_at",
                sortable: true,
                filter: {
                    type: 'date',
                },
                cell: (item: ContentEntry) => (
                    <div className="flex flex-col">
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">by {item.creator?.name || 'Unknown'}</span>
                    </div>
                ),
            },
            {
                header: "Updated",
                accessorKey: "updated_at",
                sortable: true,
                filter: {
                    type: 'date',
                },
                cell: (item: ContentEntry) => (
                    <div className="flex flex-col">
                        <span>{new Date(item.updated_at).toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">by {item.updater?.name || 'Unknown'}</span>
                    </div>
                ),
            }
        ];
        
        // Add field columns from collection fields
        if (collection?.fields && collection?.fields.length > 0) {
            // Filter out fields that shouldn't be displayed (password, json)
            const displayableFields = collection.fields.filter((field: Field) => 
                field.type !== 'password' && 
                field.type !== 'json' &&
                !field.options?.hideInContentList &&
                !field.parent_field_id // Only show top-level fields
            );
            
            // Add columns for each field
            displayableFields.forEach((field: Field) => {
                columns.push({
                    header: field.label,
                    accessorKey: field.name,
                    sortable: true,
                    cell: (item: ContentEntry) => {
                        const value = item[field.name];
                        
                        if (value === null || value === undefined || value === '') {
                            return '-';
                        }
                        
                        // Handle repeatable fields (arrays) - check if it's an array of objects
                        if (field.options?.repeatable && Array.isArray(value)) {
                            if (value.length === 0) return '-';
                            const first = value[0];
                            // If it's an array of objects (like group fields), show count
                            if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
                                return `${value.length} item${value.length === 1 ? '' : 's'}`;
                            }
                            // Otherwise, handle as simple array
                            const label = `${String(first)}${value.length > 1 ? ` (+${value.length - 1} more)` : ''}`;
                            return label;
                        }
                        
                        switch (field.type) {
                            case 'text':
                                // Truncate long text
                                return typeof value === 'string' && value.length > 30
                                    ? `${value.substring(0, 30)}...`
                                    : value;
                            case 'email':
                            case 'slug':
                                return value;
                            case 'richtext':
                                // Use the utility function to get plain text
                                const plain = getRichTextPlainText(value);
                                return plain.length > 30 ? `${plain.substring(0, 30)}...` : plain;
                            case 'longtext':
                                // Truncate long text
                                return typeof value === 'string' && value.length > 30
                                    ? `${value.substring(0, 30)}...`
                                    : value;
                            case 'date':
                                if (!value) return '-';
                                let format = 'YYYY-MM-DD' + (field.options?.includeTime ? ' HH:mm' : '');
                                if (field.options?.mode === 'range') {
                                    return value.split(' - ').map((date: any) => moment.parseZone(date).format(format)).join(' / ');
                                }
                                return moment.parseZone(value).format(format);
                            case 'boolean':
                                return value ? 'Yes' : 'No';
                            case 'enumeration':
                                if (Array.isArray(value)) {
                                    return value.join(', ');
                                }
                                if (typeof value === 'string') {
                                    try {
                                        const parsedValue = JSON.parse(value);
                                        if (Array.isArray(parsedValue)) {
                                            return parsedValue.join(', ');
                                        }
                                    } catch (e) {
                                        // Not valid JSON, return as is
                                    }
                                }
                                return value;
                            case 'number':
                                return value === null ? '-' : Number(value).toString();
                            case 'media':
                                if (!value) return '-';
                                if (Array.isArray(value)) {
                                    return (
                                        <div className="flex flex-wrap gap-1">
                                            {value.map((asset, index) => (
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
                                        const childFields = (field as any).children || collection.fields?.filter((f: Field) => f.parent_field_id === field.id) || [];
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
                    }
                });
            });
        }
        
        return columns;
    };

    const handleRowClick = (item: ContentEntry) => {
        // Single selection only
        setSelectedItem(item);
    };

    const handleSelect = () => {
        if (selectedItem) {
            onSelect(selectedItem);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Select Translation Entry</DialogTitle>
                    <DialogDescription>
                        Select an entry in locale <strong>{locale.toUpperCase()}</strong> to link as a translation.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 overflow-x-auto">
                    <DataTable
                        columns={generateColumns()}
                        searchRoute={searchRoute}
                        pageName={`translation_select_${projectId}_${collection.id}_${locale}`}
                        onRowClick={handleRowClick}
                        selectable={true}
                        onSelectionChange={(items) => {
                            // Single selection only - take the most recently selected
                            setSelectedItem(items.length > 0 ? items[items.length - 1] as ContentEntry : null);
                        }}
                        selectedItems={selectedItem ? [selectedItem] : []}
                        actions={
                            selectedItem ? [
                                {
                                    label: 'Select',
                                    onClick: handleSelect,
                                }
                            ] : []
                        }
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

