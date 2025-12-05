import React, { useState } from 'react';
import { Field } from '@/types';
import { renderField } from './index';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface FieldGroupProps {
    field: Field & {
        children?: Field[];
    };
    value: any;
    onChange: (field: Field, value: any, index?: number) => void;
    processing: boolean;
    errors: Record<string, string>;
    projectId?: number;
}

export default function FieldGroup({ field, value, onChange, processing, errors, projectId }: FieldGroupProps) {
    const isRepeatable = field.options?.repeatable ?? false;
    const childFields = field.children || [];
    
    // Normalize value to array format
    const groupInstances = React.useMemo(() => {
        if (!value) {
            return isRepeatable ? [] : [{}];
        }
        
        if (isRepeatable) {
            return Array.isArray(value) ? value : [];
        } else {
            return Array.isArray(value) && value.length > 0 ? [value[0]] : [value || {}];
        }
    }, [value, isRepeatable]);
    
    const addInstance = () => {
        const newInstance: Record<string, any> = {};
        childFields.forEach(child => {
            if (child.type === 'boolean') {
                newInstance[child.name] = false;
            } else if (child.type === 'enumeration' && child.options?.multiple) {
                newInstance[child.name] = [];
            } else if (['media', 'relation'].includes(child.type)) {
                newInstance[child.name] = [];
            } else if (child.type === 'json') {
                newInstance[child.name] = null;
            } else {
                newInstance[child.name] = '';
            }
        });
        
        const newValue = [...groupInstances, newInstance];
        onChange(field, newValue);
    };
    
    const removeInstance = (index: number) => {
        const newValue = groupInstances.filter((_, i) => i !== index);
        onChange(field, newValue);
    };
    
    const updateInstance = (instanceIndex: number, childField: Field, childValue: any) => {
        const newInstances = [...groupInstances];
        if (!newInstances[instanceIndex]) {
            newInstances[instanceIndex] = {};
        }
        newInstances[instanceIndex][childField.name] = childValue;
        onChange(field, newInstances);
    };
    
    if (childFields.length === 0) {
        return (
            <div className="text-sm text-muted-foreground">
                No child fields defined for this group.
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-medium">{field.label}</h3>
                    {field.description && (
                        <p className="text-sm text-muted-foreground">{field.description}</p>
                    )}
                </div>
                {isRepeatable && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addInstance}
                        disabled={processing}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                    </Button>
                )}
            </div>
            
            {groupInstances.length === 0 && isRepeatable ? (
                <div className="text-center py-8 border border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground mb-4">
                        No items added yet.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addInstance}
                        disabled={processing}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Item
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {groupInstances.map((instance, instanceIndex) => (
                        <div key={instanceIndex} className="relative border border-border rounded-md p-4 bg-card">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-medium">
                                    {isRepeatable ? `Item ${instanceIndex + 1}` : ''}
                                </h4>
                                {isRepeatable && groupInstances.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeInstance(instanceIndex)}
                                        disabled={processing}
                                        className="h-8 w-8 p-0"
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-4">
                                {childFields.map((childField) => {
                                    const childValue = instance[childField.name];
                                    
                                    // Extract error for this child field in this instance
                                    // Laravel returns errors with keys like: data.groupName.0.childFieldName.required
                                    // We need to check multiple possible formats
                                    const possibleKeys = [
                                        // Check with validation rule suffixes first (most specific)
                                        `data.${field.name}.${instanceIndex}.${childField.name}.required`,
                                        `data.${field.name}.${instanceIndex}.${childField.name}.email`,
                                        `data.${field.name}.${instanceIndex}.${childField.name}.numeric`,
                                        `data.${field.name}.${instanceIndex}.${childField.name}.between`,
                                        `data.${field.name}.${instanceIndex}.${childField.name}.min`,
                                        `data.${field.name}.${instanceIndex}.${childField.name}.max`,
                                        // Then check without validation rule suffix
                                        `data.${field.name}.${instanceIndex}.${childField.name}`,
                                        // Also check without data. prefix (in case errors are transformed)
                                        `${field.name}.${instanceIndex}.${childField.name}`,
                                        `${field.name}[${instanceIndex}].${childField.name}`
                                    ];
                                    
                                    // Find the first matching error key
                                    let childError: string | undefined;
                                    for (const key of possibleKeys) {
                                        const error = errors[key];
                                        if (error) {
                                            // Handle both string and array error formats
                                            childError = Array.isArray(error) ? error[0] : String(error);
                                            break;
                                        }
                                    }
                                    
                                    // Also check if there's an error for any instance (for repeatable groups)
                                    // This handles cases where Laravel might return errors without the index
                                    if (!childError && isRepeatable) {
                                        const wildcardKeys = [
                                            `data.${field.name}.*.${childField.name}.required`,
                                            `data.${field.name}.*.${childField.name}.email`,
                                            `data.${field.name}.*.${childField.name}.numeric`,
                                            `data.${field.name}.*.${childField.name}`,
                                        ];
                                        for (const key of wildcardKeys) {
                                            const error = errors[key];
                                            if (error) {
                                                childError = Array.isArray(error) ? error[0] : String(error);
                                                break;
                                            }
                                        }
                                    }
                                    
                                    // Generate unique ID for this field instance to avoid duplicate IDs
                                    const uniqueFieldId = `${field.name}-${instanceIndex}-${childField.name}`;
                                    
                                    return (
                                        <div key={childField.id || childField.name} className="space-y-2">
                                            {renderField({
                                                field: childField,
                                                value: childValue,
                                                onChange: (_, val) => updateInstance(instanceIndex, childField, val),
                                                processing,
                                                errors: childError ? { [childField.name]: childError } : {},
                                                projectId,
                                                fieldId: uniqueFieldId
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

