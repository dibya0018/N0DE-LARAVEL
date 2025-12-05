import React from 'react';
import { Field } from "@/types";

import { Label } from "@/components/ui/label";
import InputError from '@/components/input-error';

export interface FieldProps {
    field: Field;
    value: any;
    onChange: (field: Field, value: any, index?: number) => void;
    processing: boolean;
    errors: Record<string, string>;
    projectId?: number;
    fieldId?: string; // Optional unique ID for fields in groups to avoid duplicate IDs
}

export default function FieldBase({ field, children, errors, fieldId }: React.PropsWithChildren<FieldProps>) {
    const uniqueId = fieldId || field.name;
    const getFieldError = (index?: number) => {
        if (!errors) return undefined;
        if (field.options?.repeatable && typeof index === 'number') {
            const error = errors[`data.${field.name}.${index}.value`];
            return error ? (Array.isArray(error) ? error[0] : String(error)) : undefined;
        }
        
        // Check for errors with validation rule suffixes (Laravel format)
        // Common validation rule suffixes - check all possible validation types
        const validationSuffixes = ['required', 'email', 'numeric', 'color', 'between', 'min', 'max', 'string', 'array'];
        
        // Check with data. prefix first (for top-level fields)
        for (const suffix of validationSuffixes) {
            const errorKey = `data.${field.name}.${suffix}`;
            if (errors[errorKey]) {
                const error = errors[errorKey];
                return Array.isArray(error) ? error[0] : String(error);
            }
        }
        
        // Check base key with data. prefix (fallback)
        if (errors[`data.${field.name}`]) {
            const error = errors[`data.${field.name}`];
            return Array.isArray(error) ? error[0] : String(error);
        }
        
        // Check for just the field name (for nested fields in groups)
        if (errors[field.name]) {
            const error = errors[field.name];
            return Array.isArray(error) ? error[0] : String(error);
        }
        
        // Also check if there are any errors that start with the field name (catch-all)
        // This handles cases where Laravel might return errors in different formats
        for (const key in errors) {
            if (key.startsWith(`data.${field.name}.`) || key === field.name) {
                const error = errors[key];
                if (error) {
                    return Array.isArray(error) ? error[0] : String(error);
                }
            }
        }
        
        return undefined;
    };

    return (
        <div className="gap-2">
            <div className="flex items-center justify-between mb-2">
                <Label htmlFor={uniqueId}>
                    <span className="font-medium text-md">{field.label}</span>
                    {field.validations?.required?.status && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <span className="text-xs text-gray-600 dark:text-gray-300 ml-1">
                    #<span className="select-all">{field.name}</span>
                </span>
            </div>
            {children}
            {!field.options?.repeatable && (
                <InputError message={getFieldError()} />
            )}
            {field.description && (
                <p className="text-sm text-gray-500">{field.description}</p>
            )}
        </div>
    );
} 