import FieldBase, { FieldProps } from './FieldBase';

import { Switch } from "@/components/ui/switch";

export default function BooleanField({ field, value = false, onChange, processing, errors, fieldId }: FieldProps) {
    const uniqueId = fieldId || field.name;
    return (
        <FieldBase field={field} value={value} onChange={onChange} processing={processing} errors={errors}>
            <div className="flex items-center space-x-2">
                <Switch
                    id={uniqueId}
                    checked={value}
                    onCheckedChange={(checked) => onChange(field, checked)}
                    disabled={processing}
                />
                <label
                    htmlFor={uniqueId}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    {field.placeholder}
                </label>
            </div>
        </FieldBase>
    );
} 