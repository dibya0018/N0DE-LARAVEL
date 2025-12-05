import { useRef, useState, useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";
import { toast } from "sonner";
import moment from "moment";

import type { Collection, Project, Field, ContentEntry, ColumnDef, SharedData, UserCan } from "@/types";
import { renderRichTextContent, getRichTextPlainText } from "@/components/editor/utils/lexical-converter";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
    Plus, 
    Trash, 
    FileText,
    RotateCcw,
    AlignCenter,
    Link as LinkIcon,
    Copy as DuplicateIcon,
    Check,
    X,
    Folder,
    Download,
    Upload,
    FileSpreadsheet,
} from "lucide-react";
import { DataTable, DataTableRef } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import RelationEntriesTable from "@/components/ui/relation-entries-table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
    collection: Collection;
    project: Project;
}

export default function ContentList({ collection, project }: Props) {
    const dataTableRef = useRef<DataTableRef>(null);
    const [selectedItems, setSelectedItems] = useState<ContentEntry[]>([]);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showForceDeleteDialog, setShowForceDeleteDialog] = useState(false);
    const [showRestoreDialog, setShowRestoreDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [richTextModal, setRichTextModal] = useState<{title:string, content:string}|null>(null);
    const [relationModal, setRelationModal] = useState<{title:string, entries:any[], fields:Field[]}|null>(null);
    const [groupModal, setGroupModal] = useState<{title:string, data:any[], fields:Field[]}|null>(null);
    const [hasEntry, setHasEntry] = useState(false);
    const importFileInputRef = useRef<HTMLInputElement>(null);
    
    const can = usePage().props.userCan as UserCan;
    
    // Fetch entry count when component mounts for singleton collections
    useEffect(() => {
        if (collection.is_singleton) {
            axios.get(`/projects/${project.id}/collections/${collection.id}/content/search`, {
                params: { per_page: 1 }
            })
            .then(res => {
                if (res?.data?.total !== undefined) {
                    setHasEntry(res.data.total > 0);
                }
            })
            .catch(() => {
                // ignore errors – leave hasEntry as false
            });
        }
    }, [collection.is_singleton, collection.id, project.id]);
    
    const handleEdit = (item: ContentEntry) => {
        // if the item is trashed don't allow editing
        if (item.deleted_at !== null) return;

        if (!can.update_content) return;
        router.visit(route('projects.collections.content.edit', {
            project: project.id,
            collection: collection.id,
            contentEntry: item.id
        }));
    };

    const handleExport = async (format: 'json' | 'csv' | 'excel') => {
        setExporting(true);
        try {
            const response = await axios.post(
                route('projects.collections.content.export', {
                    project: project.id,
                    collection: collection.id,
                }),
                { format },
                {
                    responseType: 'blob',
                }
            );

            const blob = new Blob([response.data], {
                type: format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const extension = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'xlsx';
            a.download = `content_${collection.slug}_${new Date().toISOString().split('T')[0]}.${extension}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Content exported as ${format.toUpperCase()}`);
        } catch (error) {
            toast.error('Failed to export content');
            console.error(error);
        } finally {
            setExporting(false);
        }
    };

    const handleImport = async () => {
        const file = importFileInputRef.current?.files?.[0];
        if (!file) {
            toast.error('Please select a file');
            return;
        }

        setImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(
                route('projects.collections.content.import', {
                    project: project.id,
                    collection: collection.id,
                }),
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            toast.success(`Imported ${response.data.imported} entries`);
            if (response.data.errors && response.data.errors.length > 0) {
                console.warn('Import errors:', response.data.errors);
            }
            setShowImportDialog(false);
            if (importFileInputRef.current) {
                importFileInputRef.current.value = '';
            }
            dataTableRef.current?.fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to import content');
            console.error(error);
        } finally {
            setImporting(false);
        }
    };
    
    const handleDelete = async () => {
        setProcessing(true);
        
        try {
            const requests = selectedItems.map(item => 
                axios.delete(route('projects.collections.content.destroy', {
                    project: project.id,
                    collection: collection.id,
                    contentEntry: item.id
                }))
            );
            
            await Promise.all(requests);
            
            toast.success(`${selectedItems.length} content entries moved to trash`);
            setSelectedItems([]);
            setShowDeleteDialog(false);
            dataTableRef.current?.fetchData();
        } catch (error) {
            toast.error('Failed to move content to trash');
        } finally {
            setProcessing(false);
        }
    };
    
    const handleForceDelete = async () => {
        setProcessing(true);
        
        try {
            const requests = selectedItems.map(item => 
                axios.delete(route('projects.collections.content.forceDestroy', {
                    project: project.id,
                    collection: collection.id,
                    contentEntry: item.id
                }))
            );
            
            await Promise.all(requests);
            
            toast.success(`${selectedItems.length} content entries permanently deleted`);
            setSelectedItems([]);
            setShowForceDeleteDialog(false);
            dataTableRef.current?.fetchData();
        } catch (error) {
            toast.error('Failed to delete content');
        } finally {
            setProcessing(false);
        }
    };

    const restoreSelected = async () => {
        setProcessing(true);
        try {
            const requests = selectedItems.map(item =>
                axios.put(
                    route('projects.collections.content.restore', {
                        project: project.id,
                        collection: collection.id,
                        contentEntry: item.id,
                        contentEntryId: item.id,
                    }),
                    {}, // no body required
                )
            );
            await Promise.all(requests);
            toast.success(`${selectedItems.length} content entries restored`);
            setSelectedItems([]);
            dataTableRef.current?.fetchData();
        } catch {
            toast.error('Failed to restore content');
        }
        setProcessing(false);
    };

    const anyTrashedSelected = selectedItems.some(item => (item as any).deleted_at !== null);
    
    const locales = project.locales || [];
    const localeOptions = locales.map(locale => ({ label: locale, value: locale }));

    // Generate dynamic columns based on collection fields
    const generateColumns = (): ColumnDef[] => {
        const columns: ColumnDef[] = [
            {
                header: "Status",
                accessorKey: "status",
                sortable: true,
                align: "center",
                width: "w-24",
                padding: "px-10",
                filter: {
                    type: 'select',
                    options: [
                        { label: 'Draft', value: 'draft' },
                        { label: 'Published', value: 'published' },
                        { label: 'Trashed', value: 'trashed' },
                    ]
                },
                cell: (item: ContentEntry) => (
                    <Badge variant={item.status === 'published' ? 'default' : item.status === 'trashed' ? 'destructive' : 'outline'} className={
                        item.status === 'published' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : item.status === 'trashed' ? 'bg-red-600 hover:bg-red-700' : 'text-amber-600 border-amber-300'
                    }>
                        {item.status === 'published' ? 'Published' : item.status === 'trashed' ? 'Trashed' : 'Draft'}
                    </Badge>
                ),
            },
            {
                header: "Locale",
                accessorKey: "locale",
                sortable: true,
                align: "center",
                filter: {
                    type: 'select',
                    options: [
                        ...localeOptions,
                    ]
                },
                cell: (item: ContentEntry) => (
                    <Badge variant="outline" className="uppercase">{item.locale}</Badge>
                ),
            },
        ];
        
        // Add field columns from loaded fields
        if (collection.fields && collection.fields.length > 0) {
            // Filter out fields that shouldn't be displayed (password, json, and child fields in groups)
            const displayableFields = collection.fields.filter((field: Field) => 
                field.type !== 'password' && 
                field.type !== 'json' &&
                !field.options?.hideInContentList &&
                !field.parent_field_id // Hide child fields - only show parent group fields
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
                        
                        // If the field is repeatable and the value is an array, show first item + counter
                        if (field.options?.repeatable) {
                            if (value.length === 0) return '-';
                            const first = value[0];
                            if (typeof first === 'object') {
                                // complex objects handled later
                            } else {
                                const label = `${first}${value.length > 1 ? ` (+${value.length - 1} more)` : ''}`;
                                if (value.length === 1) {
                                    return label;
                                }
                                return (
                                    <HoverCard openDelay={100}>
                                        <HoverCardTrigger asChild>
                                            <span className="underline decoration-dotted cursor-help">{label}</span>
                                        </HoverCardTrigger>
                                        <HoverCardContent align="start" className="w-48">
                                            <ul className="list-disc pl-4 space-y-1 text-sm">
                                                {value.map((v: any, idx: number) => (
                                                    <li key={idx}>{String(v)}</li>
                                                ))}
                                            </ul>
                                        </HoverCardContent>
                                    </HoverCard>
                                );
                            }
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
                                if (value && getRichTextPlainText(value).trim() !== '') {
                                    return (
                                        <div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRichTextModal({ title: field.label, content: value });
                                                }}
                                                className="p-1 hover:bg-muted rounded"
                                            >
                                                <AlignCenter className="w-4 h-4 text-indigo-500" />
                                            </button>
                                        </div>
                                    );
                                }
                                return <div className="text-center">-</div>;
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
                                return value ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />;
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
                            case 'relation':
                                const ids = Array.isArray(value) ? value : typeof value === 'string' && value.trim() !== '' ? (():number[]=>{try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed:[]}catch{return value.split(',').map(Number) }})() : [];
                                if (ids.length>0) {
                                    return (
                                        <div className="flex">
                                            <button
                                                type="button"
                                                onClick={async (e)=>{
                                                    e.stopPropagation();
                                                    try {
                                                        const targetCollectionId = (field as any).options?.relation?.collection ?? collection.id;
                                                        const respEntries = await axios.get(route('projects.collections.content.find', {
                                                            project: project.id,
                                                            collection: targetCollectionId,
                                                        }), { params: { ids: ids.join(',') } });
                                                        // fetch collection fields
                                                        const collResp = await axios.get(route('projects.collections.content.getRelationCollection', {
                                                            project: project.id,
                                                            collection: targetCollectionId,
                                                        }));
                                                        setRelationModal({ title: field.label, entries: respEntries.data, fields: collResp.data.fields });
                                                    } catch(err){
                                                        toast.error('Failed to load related entries');
                                                    }
                                                }}
                                                className="p-1 hover:bg-muted rounded"
                                            >
                                                <LinkIcon className="w-4 h-4 text-indigo-500" />
                                            </button>
                                        </div>
                                    );
                                }
                                return <div className="text-center">-</div>;
                            case 'group':
                                // Group fields are arrays of objects (instances)
                                // For repeatable: [{field1: val1, field2: val2}, ...]
                                // For non-repeatable: [{field1: val1, field2: val2}] or {field1: val1, field2: val2}
                                const groupData = Array.isArray(value) ? value : (value ? [value] : []);
                                if (groupData.length > 0) {
                                    // Get child fields for this group
                                    const childFields = (field as any).children || collection.fields?.filter((f: Field) => f.parent_field_id === field.id) || [];
                                    
                                    return (
                                        <div className="flex">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setGroupModal({ 
                                                        title: field.label, 
                                                        data: groupData,
                                                        fields: childFields
                                                    });
                                                }}
                                                className="p-1 hover:bg-muted rounded"
                                            >
                                                <Folder className="w-4 h-4 text-indigo-500" />
                                            </button>
                                        </div>
                                    );
                                }
                                return <div className="text-center">-</div>;
                            default:
                                return value;
                        }
                    }
                });
            });
        }

        columns.push(
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
        );
        
        return columns;
    };

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <h1 className="text-xl font-bold">{collection.name}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                        #
                        <span className="select-all">{collection.slug}</span>
                    </span>
                </h1>
            </div>
            
            <DataTable
                key={collection.id}
                ref={dataTableRef}
                pageName={`content_${collection.project_id}_${collection.id}`}
                searchRoute={`/projects/${project.id}/collections/${collection.id}/content/search`}
                searchPlaceholder={`Search ${collection.name}...`}
                columns={generateColumns()}
                toolbarButtons={
                    <>
                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" disabled={exporting}>
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Export content</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleExport('json')}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Export as JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('csv')}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Export as CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('excel')}>
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    Export as Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {can.create_content && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={() => setShowImportDialog(true)}>
                                        <Upload className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Import content</TooltipContent>
                            </Tooltip>
                        )}
                    </>
                }
                actions={[
                    {
                        label: "Create New",
                        onClick: () => router.visit(route('projects.collections.content.create', { project: project.id, collection: collection.id })),
                        icon: <Plus className="h-4 w-4 mr-2" />,
                        show: can.create_content && !(collection.is_singleton && hasEntry),
                    },
                    !anyTrashedSelected ? {
                        label: "Trash",
                        onClick: () => setShowDeleteDialog(true),
                        icon: <Trash className="h-4 w-4 mr-2" />,
                        variant: "warning",
                        show: selectedItems.length > 0 && can.move_content_to_trash,
                    } : null,
                    !anyTrashedSelected && {
                        label: "Delete",
                        onClick: () => setShowForceDeleteDialog(true),
                        icon: <Trash className="h-4 w-4 mr-2" />,
                        variant: "destructive",
                        show: selectedItems.length > 0 && can.delete_content,
                    },
                    // selectedItems.length === 1 ? {
                    //     label: "Duplicate",
                    //     onClick: async () => {
                    //         const entry = selectedItems[0];
                    //         try {
                    //             await axios.post(route('projects.collections.content.duplicate', {
                    //                 project: project.id,
                    //                 collection: collection.id,
                    //                 contentEntry: entry.id,
                    //             }));
                    //             toast.success('Entry duplicated');
                    //             dataTableRef.current?.fetchData();
                    //         } catch {
                    //             toast.error('Could not duplicate');
                    //         }
                    //     },
                    //     icon: <DuplicateIcon className="h-4 w-4 mr-2" />,
                    //     show: can.create_content,
                    // } : null,
                    anyTrashedSelected ? {
                        label: "Restore Selected",
                        onClick: () => setShowRestoreDialog(true),
                        icon: <RotateCcw className="h-4 w-4 mr-2" />,
                        show: selectedItems.length > 0 && can.update_content,
                        variant: 'outline',
                    } : null,
                ].filter((a): a is any => Boolean(a))}
                onRowClick={handleEdit}
                selectable={true}
                onSelectionChange={setSelectedItems}
                selectedItems={selectedItems}
            />
            
            {/* Move to Trash Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Move to Trash</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to move {selectedItems.length} content entries to trash? You can restore them later.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowDeleteDialog(false)} 
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="warning" 
                            onClick={handleDelete} 
                            disabled={processing}
                        >
                            <Trash className="mr-2 h-4 w-4" />
                            Move to Trash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Force Delete Confirmation Dialog */}
            <Dialog open={showForceDeleteDialog} onOpenChange={setShowForceDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Permanently</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to permanently delete {selectedItems.length} content entries? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowForceDeleteDialog(false)} 
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleForceDelete} 
                            disabled={processing}
                        >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Restore Confirmation Dialog */}
            <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Restore Content</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to restore {selectedItems.length} content entries?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRestoreDialog(false)} disabled={processing}>Cancel</Button>
                        <Button onClick={async ()=>{ await restoreSelected(); setShowRestoreDialog(false);} } disabled={processing}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Restore
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rich Text preview dialog */}
            <Dialog open={!!richTextModal} onOpenChange={(open)=>!open && setRichTextModal(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{richTextModal?.title}</DialogTitle>
                        {richTextModal?.title && <DialogDescription>Rich text preview</DialogDescription>}
                    </DialogHeader>
                    {richTextModal && (
                        <ScrollArea className="max-h-[60vh] pr-4">
                            <div className="prose" dangerouslySetInnerHTML={{__html: renderRichTextContent(richTextModal.content)}} />
                        </ScrollArea>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={()=>setRichTextModal(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Relation entries dialog */}
            <Dialog open={!!relationModal} onOpenChange={(open)=>!open && setRelationModal(null)}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{relationModal?.title}</DialogTitle>
                        {relationModal?.title && <DialogDescription>Related entries</DialogDescription>}
                    </DialogHeader>
                    {relationModal && (
                            <div className="overflow-x-auto w-full">
                            <RelationEntriesTable
                                fields={relationModal.fields.filter((f)=>!['password','json'].includes(f.type) && !f.options?.hideInContentList)}
                                entries={relationModal.entries}
                                showStatus
                                showCreated
                            />
                            </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={()=>setRelationModal(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Group field dialog */}
            <Dialog open={!!groupModal} onOpenChange={(open)=>!open && setGroupModal(null)}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{groupModal?.title}</DialogTitle>
                        {groupModal?.title && <DialogDescription>Field group data</DialogDescription>}
                    </DialogHeader>
                    {groupModal && (
                        <ScrollArea className="max-h-[60vh] pr-4">
                            <div className="space-y-4">
                                {groupModal.data.map((instance: any, instanceIndex: number) => (
                                    <div key={instanceIndex} className="border rounded-lg p-4 space-y-3">
                                        <h4 className="font-medium text-sm text-muted-foreground">
                                            Item {instanceIndex + 1}
                                        </h4>
                                        <div className="space-y-2">
                                            {groupModal.fields
                                                .filter((f: Field) => !['password', 'json'].includes(f.type) && !f.options?.hideInContentList)
                                                .map((field: Field) => {
                                                    const value = instance[field.name];
                                                    
                                                    // Render field value using similar logic to RelationEntriesTable
                                                    const renderValue = () => {
                                                        if (value === null || value === undefined || value === '') return '-';
                                                        
                                                        switch (field.type) {
                                                            case 'text':
                                                            case 'longtext':
                                                                return typeof value === 'string' && value.length > 50
                                                                    ? `${value.substring(0, 50)}...`
                                                                    : value;
                                                            case 'email':
                                                            case 'slug':
                                                                return value;
                                                            case 'richtext': {
                                                                const plain = getRichTextPlainText(value);
                                                                return plain.length > 50 ? `${plain.substring(0, 50)}...` : plain;
                                                            }
                                                            case 'date': {
                                                                if (!value) return '-';
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
                                                                if (!value || !Array.isArray(value)) return '-';
                                                                return (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {value.map((asset: any, idx: number) => (
                                                                            <div key={idx} className="w-8 h-8">
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
                                                            case 'relation':
                                                                if (Array.isArray(value)) return `${value.length} relation${value.length === 1 ? '' : 's'}`;
                                                                return value ? '1 relation' : '-';
                                                            default:
                                                                return String(value);
                                                        }
                                                    };
                                                    
                                                    return (
                                                        <div key={field.id || field.name} className="grid grid-cols-2 gap-2 text-sm">
                                                            <div className="font-medium text-muted-foreground">
                                                                {field.label}:
                                                            </div>
                                                            <div>
                                                                {renderValue()}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={()=>setGroupModal(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Content Dialog */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Import Content</DialogTitle>
                        <DialogDescription>
                            Import content entries from a JSON, CSV, or Excel file. The file should match the collection structure.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="import_file">Select File</Label>
                            <Input
                                ref={importFileInputRef}
                                id="import_file"
                                type="file"
                                accept=".json,.csv,.xlsx,.xls"
                                className="w-full"
                            />
                            <p className="text-sm text-muted-foreground">
                                Supported formats: JSON, CSV, Excel (.xlsx, .xls)
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowImportDialog(false);
                                if (importFileInputRef.current) {
                                    importFileInputRef.current.value = '';
                                }
                            }}
                            disabled={importing}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleImport} disabled={importing}>
                            <Upload className="mr-2 h-4 w-4" />
                            {importing ? 'Importing...' : 'Import'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}