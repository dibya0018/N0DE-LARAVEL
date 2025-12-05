import { useForm } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
import { slugify } from '@/lib/utils';
import axios from 'axios';
import { Upload } from 'lucide-react';

import { Collection } from '@/types/index.d';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import MultiSelect from '@/components/ui/select/Select';
import type { ActionMeta } from 'react-select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: number;
    collection?: Collection;
}

interface Template {
    id: number;
    name: string;
    is_singleton?: boolean;
}

export default function CreateCollectionModal({ open, onOpenChange, projectId, collection }: Props) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: collection?.name ?? '',
        slug: collection?.slug ?? '',
        template_id: '',
        is_singleton: false as boolean,
        create_type: 'manual',
        import_file: null as File | null,
    }, {
        forceFormData: true,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [templates, setTemplates] = useState<Template[]>([]);

    useEffect(() => {
        if (!collection && open) {
            axios.get(route('collection-templates.index'))
                .then(res => setTemplates(res.data))
                .catch(() => setTemplates([]));
        }
    }, [open, collection]);

    // Generate slug from name
    useEffect(() => {
        if (data.name) {
            const generatedSlug = slugify(data.name);
            setData('slug', generatedSlug);
        }
    }, [data.name]);

    // Reset form when modal opens/closes or collection changes
    useEffect(() => {
        if (open) {
            setData({
                name: collection?.name ?? '',
                slug: collection?.slug ?? '',
                template_id: '',
                is_singleton: false as boolean,
                create_type: 'manual',
                import_file: null,
            });
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } else {
            reset();
            clearErrors();
        }
    }, [open, collection]);

    // Also clear errors whenever modal is opened fresh
    useEffect(() => {
        if (open) {
            clearErrors();
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (collection) {
            // Update existing collection
            put(route('projects.collections.update', [projectId, collection.id]), {
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            // Import from file if selected
            if (data.create_type === 'import' && data.import_file) {
                post(route('projects.collections.import', projectId), {
                    forceFormData: true,
                    onSuccess: () => {
                        reset();
                        onOpenChange(false);
                    },
                    onError: (errors) => {
                        console.error('Import error:', errors);
                    },
                });
            } else {
                // Create new collection manually
                const templateNumeric = data.template_id ? Number(data.template_id) : null;
                setData('template_id', templateNumeric as any);
                
                post(route('projects.collections.store', projectId), {
                    onSuccess: () => {
                        reset();
                        onOpenChange(false);
                    },
                });
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader className='border-b pb-3'>
                    <DialogTitle>{collection ? 'Edit Collection' : 'Create New Collection'}</DialogTitle>
                    <DialogDescription className='sr-only'>
                        Fill in the details below to create a new collection.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!collection && (
                        <div className="space-y-2">
                            <Label htmlFor="create_type">Create Type</Label>
                            <RadioGroup
                                value={data.create_type}
                                onValueChange={(value) => {
                                    setData('create_type', value);
                                    if (value === 'manual') {
                                        setData('import_file', null);
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = '';
                                        }
                                    } else {
                                        setData('name', '');
                                        setData('slug', '');
                                        setData('template_id', '');
                                    }
                                }}
                                className="grid gap-2"
                            >
                                <div className="flex items-start space-x-2 p-4 rounded-md border border-dashed border-gray-600 dark:border-gray-400">
                                    <RadioGroupItem value="manual" id="type_manual" className="mt-1" />
                                    <div className="space-y-1">
                                        <Label htmlFor="type_manual" className="font-medium">Create Manually</Label>
                                        <p className="text-sm text-muted-foreground">Create a new collection from scratch.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2 p-4 rounded-md border border-dashed border-gray-600 dark:border-gray-400">
                                    <RadioGroupItem value="import" id="type_import" className="mt-1" />
                                    <div className="space-y-1">
                                        <Label htmlFor="type_import" className="font-medium">Import from File</Label>
                                        <p className="text-sm text-muted-foreground">Import collection structure from JSON file.</p>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {!collection && data.create_type === 'import' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="import_file">Import File (JSON)</Label>
                                <div className="flex items-center space-x-2">
                                    <Input
                                        ref={fileInputRef}
                                        id="import_file"
                                        type="file"
                                        accept=".json"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setData('import_file', file);
                                                // Read and parse the file to pre-populate name and slug
                                                try {
                                                    const text = await file.text();
                                                    const jsonData = JSON.parse(text);
                                                    if (jsonData.name) {
                                                        setData('name', jsonData.name);
                                                    }
                                                    if (jsonData.slug) {
                                                        setData('slug', jsonData.slug);
                                                    }
                                                    if (jsonData.is_singleton !== undefined) {
                                                        setData('is_singleton', jsonData.is_singleton);
                                                    }
                                                } catch (error) {
                                                    console.error('Error reading file:', error);
                                                }
                                            }
                                        }}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full sm:w-auto"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        {data.import_file ? data.import_file.name : 'Choose File'}
                                    </Button>
                                </div>
                                {data.import_file && (
                                    <p className="text-sm text-muted-foreground">
                                        Selected: {data.import_file.name}
                                    </p>
                                )}
                                <InputError message={errors.import_file} />
                            </div>

                            {data.import_file && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Collection Name</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                            placeholder="Enter collection name"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="slug">Slug</Label>
                                        <Input
                                            id="slug"
                                            value={data.slug}
                                            onChange={(e) => setData('slug', e.target.value)}
                                            required
                                            placeholder="Enter collection slug"
                                        />
                                        <InputError message={errors.slug} />
                                    </div>

                                    <div className="flex items-start space-x-2 p-4 rounded-md border border-dashed border-gray-600 dark:border-gray-400">
                                        <Checkbox
                                            id="is_singleton"
                                            checked={!!data.is_singleton}
                                            onCheckedChange={(checked) => setData('is_singleton', checked === true)}
                                            className='mt-1'
                                        />
                                        <div className="space-y-1">
                                            <Label htmlFor="is_singleton">Single record collection</Label>
                                            <p className="text-sm text-muted-foreground">A single record collection is a collection that can only have one record.</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {(collection || (!collection && data.create_type === 'manual')) && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="name">Collection Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    placeholder="Enter collection name"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input
                                    id="slug"
                                    value={data.slug}
                                    onChange={(e) => setData('slug', e.target.value)}
                                    required
                                    placeholder="Enter collection slug"
                                />
                                <InputError message={errors.slug} />
                            </div>

                            {!collection && (
                                <div className="space-y-2">
                                    <Label htmlFor="template">Template</Label>
                                    <MultiSelect
                                        instanceId="template-select"
                                        options={templates.map(t => ({ value: t.id.toString(), label: t.name }))}
                                        isClearable
                                        isSearchable
                                        placeholder="Select a template (optional)"
                                        value={templates.map(t => ({ value: t.id.toString(), label: t.name })).find(o => o.value === data.template_id) || null}
                                        onChange={(newValue: any, _action: ActionMeta<any>) => {
                                            const tplId = newValue ? newValue.value : '';
                                            setData('template_id', tplId);
                                            if (tplId) {
                                                const tpl = templates.find(t => t.id.toString() === tplId);
                                                if (tpl) {
                                                    setData('is_singleton', !!(tpl as any).is_singleton);
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {/* Singleton toggle (only when creating) */}
                            {!collection && (
                                <div className="flex items-start space-x-2 p-4 rounded-md border border-dashed border-gray-600 dark:border-gray-400">
                                    <Checkbox
                                        id="is_singleton"
                                        checked={!!data.is_singleton}
                                        disabled={!!data.template_id}
                                        onCheckedChange={(checked) => setData('is_singleton', checked === true)}
                                        className='mt-1'
                                    />
                                    <div className="space-y-1">
                                        <Label htmlFor="is_singleton">Single record collection</Label>
                                        <p className="text-sm text-muted-foreground">A single record collection is a collection that can only have one record.</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <DialogFooter className='border-t pt-3'>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {collection 
                                ? 'Update Collection' 
                                : (data.create_type === 'import' ? 'Import Collection' : 'Create Collection')
                            }
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 