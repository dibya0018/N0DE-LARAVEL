import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { router, usePage } from '@inertiajs/react';
import { slugify } from '@/lib/utils';

import type { Project, Collection, Field, UserCan, ContentEntry } from "@/types";

import { Button } from "@/components/ui/button";
import {  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Clock, FileText, Calendar, User, Globe2, Copy, Key, AlertCircle, Trash2, X, CheckCircle2, Languages } from "lucide-react";
import { renderField } from './Fields';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Select from "@/components/ui/select/Select";
import TranslationSelectModal from "./TranslationSelectModal";

interface Props {
    project: Project;
    collection: Collection & {
        fields: Field[];
    };
    contentEntry?: any;
    formData?: Record<string, any>;
    isEditMode?: boolean;
}

type SaveAction = 'stay' | 'close' | 'new';
type SaveStatus = 'draft' | 'published';

export default function ContentForm({ project, collection, contentEntry, formData: initialFormData, isEditMode }: Props) {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    // Dialog states
    const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
    const [showTrashDialog, setShowTrashDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [showTranslationsDialog, setShowTranslationsDialog] = useState(false);
    const [translations, setTranslations] = useState<Record<string, any>>({});
    const [loadingTranslations, setLoadingTranslations] = useState(false);
    const [showTranslationSelectModal, setShowTranslationSelectModal] = useState(false);
    const [selectedLocaleForTranslation, setSelectedLocaleForTranslation] = useState<string | null>(null);

    const can = usePage().props.userCan as UserCan;
    const is_singleton = collection.is_singleton;
    
    // Organize fields: separate parent fields from children and attach children to their parents
    const organizedFields = React.useMemo(() => {
        const parentFields = collection.fields.filter(f => !f.parent_field_id);
        const childFieldsByParent = collection.fields
            .filter(f => f.parent_field_id)
            .reduce((acc, field) => {
                const parentId = field.parent_field_id!;
                if (!acc[parentId]) {
                    acc[parentId] = [];
                }
                acc[parentId].push(field);
                return acc;
            }, {} as Record<number, Field[]>);
        
        // Attach children to their parent fields
        return parentFields.map(field => ({
            ...field,
            children: childFieldsByParent[field.id] || []
        }));
    }, [collection.fields]);

    // Locale state
    const projLocales = (project as any).locales as string[] | undefined;
    const availableLocales = Array.isArray(projLocales) && projLocales.length ? projLocales : [project.default_locale || 'en'];
    const [locale, setLocale] = useState<string>(contentEntry?.locale || project.default_locale || availableLocales[0]);

    useEffect(() => {
        // If we have initial form data (for editing), normalise it first (e.g. media fields should be arrays of IDs)
        if (initialFormData && Object.keys(initialFormData).length > 0) {
            const normalisedData: Record<string, any> = { ...initialFormData };

            // Helper to pull the ID off either an object or primitive
            const extractId = (val: any) => (val && typeof val === 'object' ? val.id ?? null : val ?? null);

            // Helper to normalize media field value
            const normalizeMediaValue = (rawValue: any, field: Field) => {
                // Determine if this media field actually supports multiple files
                const allowsMultiple =
                    Boolean(field.options?.multiple) ||
                    (field.options?.media?.type === 2) ||
                    Array.isArray(rawValue);

                if (allowsMultiple) {
                    // Ensure we end up with an array of IDs (empty when none)
                    return Array.isArray(rawValue)
                        ? rawValue.map(extractId).filter((id: any) => id !== null)
                        : [];
                } else {
                    // Single media: reduce to the single ID (or null) and still store as an array for consistency
                    const id = Array.isArray(rawValue) ? extractId(rawValue[0]) : extractId(rawValue);
                    return id !== null ? [id] : [];
                }
            };

            // Iterate over organized fields to apply any type-specific normalisation rules
            organizedFields.forEach(field => {
                if (field.type === 'media') {
                    // Top-level media field
                    const rawValue = initialFormData[field.name];
                    normalisedData[field.name] = normalizeMediaValue(rawValue, field);
                } else if (field.type === 'group') {
                    // Normalize media fields inside group instances
                    const groupValue = initialFormData[field.name];
                    if (Array.isArray(groupValue)) {
                        normalisedData[field.name] = groupValue.map((instance: any) => {
                            const normalizedInstance = { ...instance };
                            field.children?.forEach((childField: Field) => {
                                if (childField.type === 'media' && instance[childField.name] !== undefined) {
                                    normalizedInstance[childField.name] = normalizeMediaValue(instance[childField.name], childField);
                                }
                            });
                            return normalizedInstance;
                        });
                    } else if (groupValue && typeof groupValue === 'object') {
                        // Single non-repeatable group
                        const normalizedInstance = { ...groupValue };
                        field.children?.forEach((childField: Field) => {
                            if (childField.type === 'media' && groupValue[childField.name] !== undefined) {
                                normalizedInstance[childField.name] = normalizeMediaValue(groupValue[childField.name], childField);
                            }
                        });
                        normalisedData[field.name] = [normalizedInstance];
                    }
                }
            });

            setFormData(normalisedData);
            return;
        }
        
        // Otherwise initialize form data for each field
        const newFormData: Record<string, any> = {};
        organizedFields.forEach(field => {
            if (field.type === 'group') {
                // Initialize field group
                if (field.options?.repeatable) {
                    newFormData[field.name] = [];
                } else {
                    // Single group instance - initialize with empty object
                    const instance: Record<string, any> = {};
                    if (field.children) {
                        field.children.forEach(child => {
                            if (child.type === 'boolean') {
                                instance[child.name] = false;
                            } else if (child.type === 'enumeration' && child.options?.multiple) {
                                instance[child.name] = [];
                            } else if (['media', 'relation'].includes(child.type)) {
                                instance[child.name] = [];
                            } else if (child.type === 'json') {
                                instance[child.name] = null;
                            } else {
                                instance[child.name] = '';
                            }
                        });
                    }
                    newFormData[field.name] = [instance];
                }
            } else if (field.options?.repeatable) {
                newFormData[field.name] = [{ value: null }];
            } else if (field.type === 'enumeration' && field.options?.multiple) {
                newFormData[field.name] = [];
            } else if (field.type === 'boolean') {
                newFormData[field.name] = false;
            } else if (field.type === 'media') {
                newFormData[field.name] = [];
            } else if (field.type === 'relation') {
                newFormData[field.name] = [];
            } else if (field.type === 'json') {
                newFormData[field.name] = null;
            } else {
                newFormData[field.name] = '';
            }
        });
        setFormData(newFormData);
    }, [collection, initialFormData, organizedFields]);

    const handleSubmit = async (action: SaveAction, status: SaveStatus) => {
        setProcessing(true);
        setErrors({});

        try {
            let response;
            
            if (isEditMode && contentEntry) {
                // Update existing content
                response = await axios.put(
                    route('projects.collections.content.update', {
                        project: project.id,
                        collection: collection.id,
                        contentEntry: contentEntry.id
                    }),
                    { data: formData, status, locale }
                );
            } else {
                // Create new content
                response = await axios.post(
                    route('projects.collections.content.store', {
                        project: project.id,
                        collection: collection.id
                    }),
                    { data: formData, status, locale }
                );
            }
            
            // Handle successful creation/update
            toast.success(response.data.message || 'Content saved successfully');
            
            // Handle different actions after save
            if (action === 'close' || (!isEditMode && !can.update_content)) {
                // Redirect to collection page
                router.visit(route('projects.collections.show', {
                    project: project.id,
                    collection: collection.id
                }));
            } else if (action === 'new') {
                // Reset form for a new entry
                const newFormData: Record<string, any> = {};
                collection.fields.forEach(field => {
                    if (field.options?.repeatable) {
                        newFormData[field.name] = [{ value: null }];
                    } else if (field.type === 'enumeration' && field.options?.multiple) {
                        newFormData[field.name] = [];
                    } else if (field.type === 'boolean') {
                        newFormData[field.name] = false;
                    } else if (field.type === 'media') {
                        newFormData[field.name] = [];
                    } else if (field.type === 'relation') {
                        newFormData[field.name] = [];
                    } else if (field.type === 'json') {
                        newFormData[field.name] = null;
                    } else {
                        newFormData[field.name] = '';
                    }
                });
                setFormData(newFormData);
                window.scrollTo(0, 0);
            } else if (action === 'stay' && !isEditMode && can.update_content && response.data.entry_id) {
                // If this is a new entry and we want to stay, redirect to edit mode
                const entryId = response.data.entry_id;
                
                // Use setTimeout to ensure the response is fully processed
                setTimeout(() => {
                    router.visit(route('projects.collections.content.edit', {
                        project: project.id,
                        collection: collection.id,
                        contentEntry: entryId
                    }));
                }, 100);
            } else if (action === 'stay' && isEditMode) {
                // Refresh the page to reflect the updated status
                router.reload();
            }
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                toast.error('Failed to save content. Please check the form for errors.');
            } else {
                toast.error('An error occurred while saving content.');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleUnpublish = async () => {
        setProcessing(true);
        
        try {
            await handleSubmit('stay', 'draft');
            setShowUnpublishDialog(false);
        } catch (error) {
            
        } finally {
            setProcessing(false);
        }
    };

    const handleMoveToTrash = async () => {
        setProcessing(true);
        
        try {
            const response = await axios.delete(
                route('projects.collections.content.destroy', {
                    project: project.id,
                    collection: collection.id,
                    contentEntry: contentEntry.id
                })
            );
            
            toast.success(response.data.message || 'Content moved to trash successfully');
            
            // Redirect to collection page
            router.visit(route('projects.collections.show', {
                project: project.id,
                collection: collection.id
            }));
        } catch (error: any) {
            toast.error('Failed to move content to trash.');
        } finally {
            setProcessing(false);
            setShowTrashDialog(false);
        }
    };

    const handleDelete = async () => {
        setProcessing(true);
        
        try {
            const response = await axios.delete(
                route('projects.collections.content.forceDestroy', {
                    project: project.id,
                    collection: collection.id,
                    contentEntry: contentEntry.id
                })
            );
            
            toast.success(response.data.message || 'Content permanently deleted');
            
            // Redirect to collection page
            router.visit(route('projects.collections.show', {
                project: project.id,
                collection: collection.id
            }));
        } catch (error: any) {
            toast.error('Failed to delete content.');
        } finally {
            setProcessing(false);
            setShowDeleteDialog(false);
        }
    };

    const handleDuplicate = async () => {
        setProcessing(true);
        try {
            const response = await axios.post(route('projects.collections.content.duplicate', {
                project: project.id,
                collection: collection.id,
                contentEntry: contentEntry.id,
            }));

            toast.success(response.data.message || 'Content duplicated');

            const newId = response.data.entry_id;
            if (newId) {
                router.visit(route('projects.collections.content.edit', {
                    project: project.id,
                    collection: collection.id,
                    contentEntry: newId,
                }));
            } else {
                router.reload();
            }
        } catch (error) {
            toast.error('Failed to duplicate content');
        } finally {
            setProcessing(false);
            setShowDuplicateDialog(false);
        }
    };

    const fetchTranslations = async () => {
        await fetchTranslationsWithGroupId();
    };
    
    const fetchTranslationsWithGroupId = async (translationGroupId?: string) => {
        if (!contentEntry) return;
        
        setLoadingTranslations(true);
        try {
            const translationsMap: Record<string, any> = {};
            
            // Use provided translation_group_id or fall back to contentEntry's
            const groupId = translationGroupId || (contentEntry as any).translation_group_id;
            
            // Fetch entries for each locale
            for (const loc of availableLocales) {
                if (loc === contentEntry.locale) {
                    // Current entry
                    translationsMap[loc] = contentEntry;
                } else if (groupId) {
                    // Find entry in the same translation group with this locale
                    try {
                        const response = await axios.get(route('projects.collections.content.search', {
                            project: project.id,
                            collection: collection.id,
                        }), {
                            params: {
                                filter_locale: loc,
                                per_page: 100,
                            }
                        });
                        
                        // Find entry with matching translation_group_id
                        const linkedEntry = response.data.data?.find((entry: any) => 
                            entry.translation_group_id === groupId
                        );
                        
                        translationsMap[loc] = linkedEntry || null;
                    } catch (error) {
                        translationsMap[loc] = null;
                    }
                } else {
                    // No translation group yet
                    translationsMap[loc] = null;
                }
            }
            
            setTranslations(translationsMap);
        } catch (error) {
            toast.error('Failed to fetch translations');
        } finally {
            setLoadingTranslations(false);
        }
    };

    const handleSelectTranslation = (locale: string, entry: any) => {
        if (entry && entry.id) {
            // Navigate to existing translation
            router.visit(route('projects.collections.content.edit', {
                project: project.id,
                collection: collection.id,
                contentEntry: entry.id,
            }));
        } else {
            // Open select modal to choose or create entry
            setSelectedLocaleForTranslation(locale);
            setShowTranslationSelectModal(true);
        }
    };

    const handleLinkTranslation = async (entry: ContentEntry) => {
        if (!contentEntry) return;
        
        try {
            await axios.post(route('projects.collections.content.linkTranslation', {
                project: project.id,
                collection: collection.id,
                contentEntry: contentEntry.id,
            }), {
                translation_entry_id: entry.id,
            });
            
            toast.success('Translation linked successfully');
            setShowTranslationSelectModal(false);
            setSelectedLocaleForTranslation(null);
            
            // Fetch updated entry to get the new translation_group_id
            // (backend creates/updates it during linking)
            try {
                const response = await axios.get(route('projects.collections.content.show', {
                    project: project.id,
                    collection: collection.id,
                    contentEntry: contentEntry.id,
                }));
                const updatedEntry = response.data;
                // Use the updated entry's translation_group_id to fetch translations
                await fetchTranslationsWithGroupId(updatedEntry.translation_group_id);
            } catch (error) {
                // Fallback: refresh translations with current contentEntry
                await fetchTranslations();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to link translation');
        }
    };

    const handleUnlinkTranslation = async (locale: string, entry: any) => {
        if (!contentEntry || !entry) return;
        
        try {
            await axios.post(route('projects.collections.content.unlinkTranslation', {
                project: project.id,
                collection: collection.id,
                contentEntry: contentEntry.id,
            }), {
                translation_entry_id: entry.id,
            });
            
            toast.success('Translation unlinked successfully');
            // Refresh translations
            fetchTranslations();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to unlink translation');
        }
    };

    const handleFieldChange = (field: Field, value: any, index?: number) => {
        const newData = { ...formData };

        if (field.type === 'group') {
            // Field groups handle their own value structure
            newData[field.name] = value;
        } else if (field.options?.repeatable) {
            if (typeof index === 'number') {
                // We're updating a specific item in the repeatable field
                if (!Array.isArray(newData[field.name])) {
                    newData[field.name] = [{ value: null }];
                }
                newData[field.name][index].value = value;
            } else {
                // We're replacing the entire array (used when adding or removing items)
                newData[field.name] = value;
            }
        } else if (field.type === 'media') {
            // For media fields, ensure we're storing an array of IDs
            newData[field.name] = Array.isArray(value) ? value : (value ? [value] : []);
        } else {
            newData[field.name] = value;
        }

        // If this field is referenced by a slug field, update the slug
        const slugField = organizedFields.find(f =>
            f.type === 'slug' &&
            f.options?.slug?.field === field.name
        );
        if (slugField && !field.options?.repeatable && field.type !== 'group') {
            newData[slugField.name] = slugify(value);
        }

        setFormData(newData);
    };

    // Format a date for display
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    return (
        <div>
            <div className="space-y-6">
                <div className="flex justify-between space-x-4">
                    <div className="space-y-4 w-3/4">
                        {is_singleton && (
                            <div className="mb-3">
                                <h1 className="text-xl font-bold">{collection.name}
                                    <span className="text-sm font-normal text-muted-foreground ml-2">
                                        #
                                        <span className="select-all">{collection.slug}</span>
                                    </span>
                                </h1>
                            </div>
                        )}
                        {organizedFields.map(field => (
                            <div className="border border-gray-200 dark:border-gray-800 border-dashed w-full p-4 rounded-md" key={field.id}>
                                <React.Fragment>
                                    {renderField({
                                        field,
                                        value: formData[field.name],
                                        onChange: handleFieldChange,
                                        processing,
                                        errors,
                                        projectId: project.id
                                    })}
                                </React.Fragment>
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex-1 w-1/4">
                        <aside className="space-y-4 sticky top-4">
                            {!is_singleton && (
                                <>
                                <div className="flex flex-col space-y-3">
                                    {isEditMode && contentEntry.status === 'draft' && (
                                        <div className="flex space-x-2">
                                            <Button 
                                                onClick={() => handleSubmit('stay', 'draft')}
                                                disabled={processing}
                                                className="flex-grow"
                                            >
                                                Save as draft
                                            </Button>
                                        </div>
                                    )}
                                    {!isEditMode && (
                                        <div className="flex space-x-2">
                                            <Button 
                                                onClick={() => handleSubmit('stay', 'draft')}
                                                disabled={processing}
                                                className="flex-grow"
                                            >
                                                Save as draft
                                            </Button>
                                            {!isEditMode && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="icon" className="px-2">
                                                            <ChevronDown className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleSubmit('close', 'draft')}>
                                                            Save and close
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleSubmit('new', 'draft')}>
                                                            Save and create new
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    )}
                                    
                                    {isEditMode && can.publish_content && (
                                        <div className="flex space-x-2">
                                            <Button 
                                                onClick={() => handleSubmit('stay', 'published')}
                                                disabled={processing}
                                                className="flex-grow bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                Save & Publish
                                            </Button>
                                        </div>
                                    )}
                                    
                                    {!isEditMode && can.publish_content && (
                                        <div className="flex space-x-2">
                                            <Button 
                                                onClick={() => handleSubmit('stay', 'published')}
                                                disabled={processing}
                                                className="flex-grow bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                Save & Publish
                                            </Button>
                                            {!isEditMode && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="icon" className="px-2">
                                                            <ChevronDown className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleSubmit('close', 'published')}>
                                                            Save, publish and close
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleSubmit('new', 'published')}>
                                                            Save, publish and create new
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {isEditMode && contentEntry && (
                                    <div className={`p-3 rounded-md flex items-center justify-between ${
                                        contentEntry.status === 'published' 
                                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                                            : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                                    }`}>
                                        <div className="flex items-center space-x-2">
                                            {contentEntry.status === 'published' ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                            ) : (
                                                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                            )}
                                            <div>
                                                <h3 className={`font-medium ${
                                                    contentEntry.status === 'published' 
                                                        ? 'text-green-700 dark:text-green-400' 
                                                        : 'text-amber-700 dark:text-amber-400'
                                                }`}>
                                                    {contentEntry.status === 'published' ? 'Published' : 'Draft'}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {contentEntry.status === 'published' 
                                                        ? `Published on ${new Date(contentEntry.published_at).toLocaleDateString()}`
                                                        : 'This entry is not yet published'}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={contentEntry.status === 'published' ? 'default' : 'outline'} className={
                                            contentEntry.status === 'published' 
                                                ? 'bg-green-600 hover:bg-green-700' 
                                                : 'text-amber-600 border-amber-300 dark:border-amber-600'
                                        }>
                                            {contentEntry.status === 'published' ? 'Live' : 'Draft'}
                                        </Badge>
                                    </div>
                                )}

                                {isEditMode && contentEntry && contentEntry.status === 'published' && can.unpublish_content && (
                                    <Button 
                                        onClick={() => setShowUnpublishDialog(true)}
                                        disabled={processing}
                                        variant="outline"
                                        className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20"
                                    >
                                        <AlertCircle className="mr-2 h-4 w-4" />
                                        Unpublish
                                    </Button>
                                )}
                                
                                {isEditMode && contentEntry && (can.create_content || can.move_content_to_trash || can.delete_content) && (
                                    <>
                                        <div className="flex space-x-2">
                                            
                                            {can.move_content_to_trash && (
                                                <Button
                                                    onClick={() => setShowTrashDialog(true)}
                                                    variant="outline"
                                                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Move to Trash
                                                </Button>
                                            )}
                                            {can.delete_content && (
                                                <Button
                                                    onClick={() => setShowDeleteDialog(true)}
                                                    variant="outline"
                                                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <X className="mr-2 h-4 w-4" />
                                                    Delete
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex space-x-2">
                                            {can.create_content && (
                                                <Button
                                                    onClick={() => setShowDuplicateDialog(true)}
                                                    variant="outline"
                                                    className="flex-1"
                                                    disabled={processing}
                                                >
                                                    <Copy className="mr-2 h-4 w-4" />
                                                    Duplicate
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )}
                                
                                
                                </>
                            )} 

                            {is_singleton && (
                                <div className="flex space-x-2">
                                    <Button 
                                        onClick={() => handleSubmit('stay', 'published')}
                                        disabled={processing}
                                        className="flex-grow bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        Save Content
                                    </Button>
                                </div>
                            )}

                            {is_singleton && (
                                <div className="text-sm text-muted-foreground">
                                    This is a single entry collection. Only one content entry is allowed.
                                </div>
                            )}

                            {/* Locale selector */}
                            <Card className="py-2">
                                <CardContent className="py-3">
                                    
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium flex items-center space-x-2">
                                            <Globe2 className="w-4 h-4 text-muted-foreground" />
                                            <span>Locale</span>
                                        </h3>
                                        <Select
                                            isMulti={false}
                                            value={{ value: locale, label: locale.toUpperCase() }}
                                            onChange={(option: any) => setLocale(option?.value || project.default_locale)}
                                            options={availableLocales.map(l => ({ value: l, label: l.toUpperCase() }))}
                                            isDisabled={processing}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {isEditMode && availableLocales.length > 1 && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    disabled={processing}
                                    onClick={() => {
                                        setShowTranslationsDialog(true);
                                        fetchTranslations();
                                    }}
                                >
                                    <Languages className="mr-2 h-4 w-4" />
                                    Translations
                                </Button>
                            )}

                            {isEditMode && contentEntry && (
                                <Card className="py-2">
                                    <CardContent className="py-3">
                                        <h3 className="text-sm font-medium mb-3">Content Details</h3>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">ID:</span>
                                                </div>
                                                <span className="font-medium">{contentEntry.id}</span>
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <Key className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">UUID:</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <span className="font-medium">
                                                        {contentEntry.uuid ? `${contentEntry.uuid.substring(0, 8)}...` : 'N/A'}
                                                    </span>
                                                    {contentEntry.uuid && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6 w-6"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(contentEntry.uuid);
                                                                toast.success('UUID copied to clipboard');
                                                            }}
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <Separator />
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">Created:</span>
                                                </div>
                                                <span className="font-medium">{formatDate(contentEntry.created_at)}</span>
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">By:</span>
                                                </div>
                                                <span className="font-medium">{contentEntry.creator?.name || 'Unknown'}</span>
                                            </div>
                                            
                                            <Separator />
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">Updated:</span>
                                                </div>
                                                <span className="font-medium">{formatDate(contentEntry.updated_at)}</span>
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">By:</span>
                                                </div>
                                                <span className="font-medium">{contentEntry.updater?.name || 'Unknown'}</span>
                                            </div>
                                            
                                            <Separator />
                                            
                                            {contentEntry.status === 'published' && contentEntry.published_at && (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-muted-foreground">Published:</span>
                                                    </div>
                                                    <span className="font-medium">{formatDate(contentEntry.published_at)}</span>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <Globe2 className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">Locale:</span>
                                                </div>
                                                <Badge variant="outline" className="uppercase">
                                                    {contentEntry.locale || 'en'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </aside>
                    </div>
                </div>
            </div>

            {/* Unpublish Confirmation Dialog */}
            <Dialog open={showUnpublishDialog} onOpenChange={setShowUnpublishDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Unpublish Content</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to unpublish this content? It will no longer be visible to users.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUnpublishDialog(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button 
                            variant="default" 
                            onClick={handleUnpublish} 
                            disabled={processing}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Unpublish
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Move to Trash Confirmation Dialog */}
            <Dialog open={showTrashDialog} onOpenChange={setShowTrashDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Move to Trash</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to move this content to trash? You can restore it later.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTrashDialog(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleMoveToTrash} 
                            disabled={processing}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Move to Trash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Content Permanently</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to permanently delete this content? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDelete} 
                            disabled={processing}
                        >
                            <X className="mr-2 h-4 w-4" />
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Duplicate Confirmation Dialog */}
            <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Duplicate Content</DialogTitle>
                        <DialogDescription>
                            This will create a new draft copy of the current entry. Continue?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDuplicateDialog(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleDuplicate} disabled={processing}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Translations Dialog */}
            <Dialog open={showTranslationsDialog} onOpenChange={setShowTranslationsDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Translations</DialogTitle>
                        <DialogDescription>
                            Manage translations for this content entry across different locales.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        {loadingTranslations ? (
                            <div className="text-center py-4 text-muted-foreground">
                                Loading translations...
                            </div>
                        ) : (
                            availableLocales.map((loc) => {
                                const translation = translations[loc];
                                const isCurrent = contentEntry && contentEntry.locale === loc;
                                
                                return (
                                    <div
                                        key={loc}
                                        className="flex items-center justify-between p-3 border rounded-md"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Badge variant="outline" className="uppercase">
                                                {loc}
                                            </Badge>
                                            {isCurrent && (
                                                <Badge variant="default" className="text-xs">
                                                    Current
                                                </Badge>
                                            )}
                                            {translation && !isCurrent && (
                                                <button
                                                    onClick={() => {
                                                        router.visit(route('projects.collections.content.edit', {
                                                            project: project.id,
                                                            collection: collection.id,
                                                            contentEntry: translation.id,
                                                        }));
                                                    }}
                                                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                                                >
                                                    Entry #{translation.id}
                                                </button>
                                            )}
                                            {!translation && !isCurrent && (
                                                <span className="text-sm text-muted-foreground">
                                                    No translation
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {translation && !isCurrent && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUnlinkTranslation(loc, translation)}
                                                    disabled={loadingTranslations}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    Unlink
                                                </Button>
                                            )}
                                            {!translation && !isCurrent && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => {
                                                        handleSelectTranslation(loc, translation);
                                                    }}
                                                    disabled={loadingTranslations}
                                                >
                                                    Select
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTranslationsDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Translation Select Modal */}
            {selectedLocaleForTranslation && (
                <TranslationSelectModal
                    isOpen={showTranslationSelectModal}
                    onClose={() => {
                        setShowTranslationSelectModal(false);
                        setSelectedLocaleForTranslation(null);
                    }}
                    collection={collection}
                    projectId={project.id}
                    locale={selectedLocaleForTranslation}
                    excludeEntryIds={[
                        contentEntry?.id,
                        ...Object.values(translations)
                            .filter((t: any) => t && t.id)
                            .map((t: any) => t.id)
                    ].filter(Boolean) as number[]}
                    onSelect={handleLinkTranslation}
                />
            )}
        </div>
    );
}