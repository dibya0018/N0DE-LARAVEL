import React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TextCursor, AlignLeft, Link, AtSign, Lock, Hash, ListOrdered, CheckSquare, Droplet, Calendar, Clock, Image, GitBranch, Code, Layers } from 'lucide-react';

import fields from '@/lib/fields.json';

import FieldFormModal from './FieldFormModal';

interface AddFieldModalProps {
    isOpen: boolean;
    onClose: () => void;
    collectionId: number;
    projectId: number;
    onFieldCreated?: () => void;
    collections: Array<{
        id: number;
        name: string;
    }>;
    collectionFields: Array<{
        id: number;
        name: string;
        label: string;
        type: string;
    }>;
    parentFieldId?: number;
    can: {
        create_field?: boolean;
        update_field?: boolean;
        delete_field?: boolean;
    };
}

export default function AddFieldModal({ isOpen, onClose, collectionId, projectId, onFieldCreated, collections, collectionFields, parentFieldId, can }: AddFieldModalProps) {
    const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);

    const handleFieldTypeSelect = (fieldType: string) => {
        setSelectedFieldType(fieldType);
    };

    const handleFieldFormClose = () => {
        setSelectedFieldType(null);
        onClose();
        onFieldCreated?.();
    };

    // Filter out 'group' type when adding to a group
    const availableFields = parentFieldId 
        ? Object.entries(fields).filter(([type]) => type !== 'group')
        : Object.entries(fields);

    return (
        <>
            <Dialog open={isOpen && !selectedFieldType} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{parentFieldId ? 'Add Field to Group' : 'Add Field'}</DialogTitle>
                        <DialogDescription className='sr-only'>
                            {parentFieldId 
                                ? 'Select a field type to add to this group.'
                                : 'Select a field type to add to your collection.'}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] pr-4">
                        <div className="grid grid-cols-2 gap-4">
                            {availableFields.map(([type, field]) => (
                                <button
                                    key={type}
                                    onClick={() => handleFieldTypeSelect(type)}
                                    className="flex items-start space-x-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                                >
                                    <div className={cn('rounded-md p-2', field.bg)}>
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
                                                ,
                                                Layers
                                            }[field.icon] || TextCursor,
                                            { className: 'text-white' }
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-medium">{field.label}</h3>
                                        <p className="text-sm text-muted-foreground">{field.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {selectedFieldType && (
                <FieldFormModal
                    isOpen={!!selectedFieldType}
                    onClose={handleFieldFormClose}
                    fieldType={selectedFieldType}
                    collectionId={collectionId}
                    projectId={projectId}
                    collections={collections}
                    collectionFields={collectionFields}
                    parentFieldId={parentFieldId}
                    can={can}
                />
            )}
        </>
    );
} 