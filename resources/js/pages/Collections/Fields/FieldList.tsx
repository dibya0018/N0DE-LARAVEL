import React from 'react';
import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import axios from 'axios';

import type { Field } from '@/types/index.d';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Pencil, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { TextCursor, AlignLeft, Link, AtSign, Lock, Hash, ListOrdered, CheckSquare, Droplet, Calendar, Clock, Image, GitBranch, Code, Layers } from 'lucide-react';

import fields from '@/lib/fields.json';

import type { FieldFormModalProps, Validations, FieldFormData } from './FieldFormModal';

import FieldFormModal from './FieldFormModal';
import AddFieldModal from './AddFieldModal';

interface FieldListProps {
    projectId: number;
    collectionId: number;
    initialFields: Field[];
    onAddFieldClick: () => void;
    collections: Array<{
        id: number;
        name: string;
    }>;
    can: {
        create_field?: boolean;
        update_field?: boolean;
        delete_field?: boolean;
    };
}

export default function FieldList({ projectId, collectionId, initialFields, onAddFieldClick, collections, can }: FieldListProps) {
    const [fieldsList, setFieldsList] = useState([...initialFields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [fieldToEdit, setFieldToEdit] = useState<Field | null>(null);
    const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
    const [parentFieldForAdd, setParentFieldForAdd] = useState<number | undefined>(undefined);
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

    // Update fieldsList when initialFields changes
    useEffect(() => {
        const sorted = [...initialFields].sort((a, b) => {
            // Sort by parent_field_id first (nulls first), then by order
            if (a.parent_field_id !== b.parent_field_id) {
                if (!a.parent_field_id) return -1;
                if (!b.parent_field_id) return 1;
                return a.parent_field_id - b.parent_field_id;
            }
            return (a.order ?? 0) - (b.order ?? 0);
        });
        setFieldsList(sorted);
        
        // Auto-expand groups that have children
        const childFieldsByParent = sorted
            .filter(f => f.parent_field_id)
            .reduce((acc, field) => {
                const parentId = field.parent_field_id!;
                if (!acc[parentId]) {
                    acc[parentId] = [];
                }
                acc[parentId].push(field);
                return acc;
            }, {} as Record<number, Field[]>);
        
        const groupsWithChildren = sorted
            .filter(f => f.type === 'group' && !f.parent_field_id && childFieldsByParent[f.id] && childFieldsByParent[f.id].length > 0)
            .map(f => f.id);
        if (groupsWithChildren.length > 0) {
            setExpandedGroups(new Set(groupsWithChildren));
        }
    }, [initialFields]);

    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(fieldsList);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update local state immediately for smooth UI
        setFieldsList(items);

        // Update the order in the backend
        try {
            await axios.post(route('projects.collections.fields.reorder', {
                project: projectId,
                collection: collectionId
            }), {
                fields: items.map((item, index) => ({
                    id: item.id,
                    order: index,
                })),
            });
        } catch (error) {
            console.error('Failed to update field order:', error);
            // Revert to original order if the API call fails
            setFieldsList(initialFields);
        }
    };

    const handleEditClick = (field: Field) => {
        setFieldToEdit(field);
        setIsEditModalOpen(true);
    };

    const handleEditModalClose = () => {
        setIsEditModalOpen(false);
        setFieldToEdit(null);
    };

    const handleAddFieldToGroup = (groupId: number) => {
        setParentFieldForAdd(groupId);
        setIsAddFieldModalOpen(true);
    };

    const handleAddFieldModalClose = () => {
        setIsAddFieldModalOpen(false);
        setParentFieldForAdd(undefined);
        // Reload fields
        router.reload({ only: ['collection'] });
    };

    const toggleGroupExpanded = (groupId: number) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
        } else {
            newExpanded.add(groupId);
        }
        setExpandedGroups(newExpanded);
    };

    // Organize fields: separate parent fields from children
    const parentFields = fieldsList.filter(f => !f.parent_field_id);
    const childFieldsByParent = fieldsList
        .filter(f => f.parent_field_id)
        .reduce((acc, field) => {
            const parentId = field.parent_field_id!;
            if (!acc[parentId]) {
                acc[parentId] = [];
            }
            acc[parentId].push(field);
            return acc;
        }, {} as Record<number, Field[]>);
    
    // Sort children by order for each parent
    Object.keys(childFieldsByParent).forEach(parentId => {
        childFieldsByParent[Number(parentId)].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });

    return (
        <Card className="flex-1">
            <CardHeader>
                <CardTitle>Fields</CardTitle>
                <CardDescription>
                    Add, edit, and reorder fields to structure your collection's data
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {can.create_field && (
                    <Button 
                        className="w-full" 
                        onClick={onAddFieldClick}
                    >
                        <Plus className="mr-1" />
                        Add Field
                    </Button>
                    )}

                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="fields">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-4"
                                >
                                    {parentFields.map((field, index) => {
                                        const fieldInfo = fields[field.type as keyof typeof fields];
                                        const isGroup = field.type === 'group';
                                        const children = childFieldsByParent[field.id] || [];
                                        const isExpanded = expandedGroups.has(field.id);
                                        
                                        return (
                                            <div key={field.id} className="space-y-2">
                                                <Draggable
                                                    draggableId={field.id.toString()}
                                                    index={index}
                                                >
                                                    {(provided) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className="flex items-center justify-between p-4 border rounded-lg"
                                                        >
                                                            <div className="flex items-center space-x-4 flex-1">
                                                                {can.update_field && (
                                                                    <div
                                                                        {...provided.dragHandleProps}
                                                                        className="cursor-grab"
                                                                    >
                                                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                                {isGroup && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        onClick={() => toggleGroupExpanded(field.id)}
                                                                    >
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="h-4 w-4" />
                                                                        ) : (
                                                                            <ChevronRight className="h-4 w-4" />
                                                                        )}
                                                                    </Button>
                                                                )}
                                                                <div className={cn('rounded-md p-2', fieldInfo?.bg || 'bg-gray-400')}>
                                                                    {React.createElement(
                                                                        {
                                                                            TextCursor,
                                                                            TextAlignLeft: AlignLeft,
                                                                            Link,
                                                                            AtSign,
                                                                            Lock,
                                                                            SortNumericUp: Hash,
                                                                            ListOrdered,
                                                                            CheckSquare,
                                                                            Tint: Droplet,
                                                                            Calendar,
                                                                            CalendarCheck: Clock,
                                                                            PhotoVideo: Image,
                                                                            ExchangeAlt: GitBranch,
                                                                            Code,
                                                                            Layers
                                                                        }[fieldInfo?.icon || 'TextCursor'] || TextCursor,
                                                                        { className: 'text-white' }
                                                                    )}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="font-medium">{field.label}</div>
                                                                    <div className="text-sm text-muted-foreground select-all">
                                                                        {field.name}
                                                                    </div>
                                                                    {isGroup && (
                                                                        <div className="text-xs text-muted-foreground mt-1">
                                                                            {children.length} {children.length === 1 ? 'field' : 'fields'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                {isGroup && can.create_field && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleAddFieldToGroup(field.id)}
                                                                    >
                                                                        <Plus className="h-3 w-3 mr-1" />
                                                                        Add Field
                                                                    </Button>
                                                                )}
                                                                {can.update_field && (
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon"
                                                                        onClick={() => handleEditClick(field)}
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                                
                                                {/* Show child fields if group is expanded */}
                                                {isGroup && isExpanded && children.length > 0 && (
                                                    <div className="ml-8 space-y-2 border-l-2 pl-4">
                                                        {children.map((childField) => {
                                                            const childFieldInfo = fields[childField.type as keyof typeof fields];
                                                            return (
                                                                <div
                                                                    key={childField.id}
                                                                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                                                                >
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className={cn('rounded-md p-1.5', childFieldInfo?.bg || 'bg-gray-400')}>
                                                                            {React.createElement(
                                                                                {
                                                                                    TextCursor,
                                                                                    TextAlignLeft: AlignLeft,
                                                                                    Link,
                                                                                    AtSign,
                                                                                    Lock,
                                                                                    SortNumericUp: Hash,
                                                                                    ListOrdered,
                                                                                    CheckSquare,
                                                                                    Tint: Droplet,
                                                                                    Calendar,
                                                                                    CalendarCheck: Clock,
                                                                                    PhotoVideo: Image,
                                                                                    ExchangeAlt: GitBranch,
                                                                                    Code
                                                                                }[childFieldInfo?.icon || 'TextCursor'] || TextCursor,
                                                                                { className: 'text-white text-xs' }
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-sm font-medium">{childField.label}</div>
                                                                            <div className="text-xs text-muted-foreground select-all">
                                                                                {childField.name}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {can.update_field && (
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => handleEditClick(childField)}
                                                                        >
                                                                            <Pencil className="h-3 w-3" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            </CardContent>

            {fieldToEdit && (
                <FieldFormModal
                    isOpen={isEditModalOpen}
                    onClose={handleEditModalClose}
                    fieldType={fieldToEdit.type}
                    collectionId={collectionId}
                    projectId={projectId}
                    collections={collections}
                    collectionFields={fieldsList}
                    parentFieldId={fieldToEdit.parent_field_id}
                    can={can}
                    editField={{
                        ...fieldToEdit,
                        description: fieldToEdit.description ?? '',
                        placeholder: fieldToEdit.placeholder ?? '',
                        validations: (fieldToEdit.validations ?? {
                            required: { status: false, message: '' },
                            unique: { status: false, message: '' },
                            charcount: { status: false, message: '', type: 'Between', min: null, max: null }
                        }) as Validations,
                        options: (fieldToEdit.options ?? {
                            repeatable: false,
                            hideInContentList: false,
                            hiddenInAPI: false,
                            editor: { type: 1 },
                            enumeration: { list: [] },
                            multiple: false,
                            relation: { collection: null, type: 1 },
                            slug: { field: null, readonly: false },
                            timepicker: false,
                            range: false,
                            date_format: 'DD-MM-YYYY',
                            hour_format: 'HH:mm',
                            multi_calendars: false,
                            media: { type: 1 }
                        }) as FieldFormData['options']
                    } as NonNullable<FieldFormModalProps['editField']>}
                />
            )}

            <AddFieldModal
                isOpen={isAddFieldModalOpen}
                onClose={handleAddFieldModalClose}
                collectionId={collectionId}
                projectId={projectId}
                onFieldCreated={handleAddFieldModalClose}
                collections={collections}
                collectionFields={fieldsList}
                parentFieldId={parentFieldForAdd}
                can={can}
            />
        </Card>
    );
} 