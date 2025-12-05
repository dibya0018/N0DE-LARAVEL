import FieldBase, { FieldProps } from './FieldBase';

import { Input } from "@/components/ui/input";

export default function SlugField({ field, value, onChange, processing, errors, fieldId }: FieldProps) {
    const uniqueId = fieldId || field.name;
    return (
        <FieldBase field={field} value={value} onChange={onChange} processing={processing} errors={errors}>
            <Input
                id={uniqueId}
                type="text"
                required={field.required}
                value={value || ''}
                onChange={(e) => onChange(field, e.target.value)}
                disabled={processing || field.options?.slug?.readonly}
                placeholder={field.placeholder}
                className={field.options?.slug?.readonly ? 'cursor-not-allowed' : ''}
            />
        </FieldBase>
    );
} 