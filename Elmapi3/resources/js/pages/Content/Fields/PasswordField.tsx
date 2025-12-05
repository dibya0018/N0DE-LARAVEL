import React from 'react';

import { generatePassword } from '@/lib/utils';

import FieldBase, { FieldProps } from './FieldBase';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, KeyRound } from 'lucide-react';

export default function PasswordField({ field, value, onChange, processing, errors, fieldId }: FieldProps) {
    const uniqueId = fieldId || field.name;
    const [visibility, setVisibility] = React.useState<boolean>(false);
    const [localValue, setLocalValue] = React.useState<string>('');

    const toggleVisibility = () => {
        setVisibility(prev => !prev);
    };

    const handleGeneratePassword = () => {
        const password = generatePassword();
        setLocalValue(password);
        onChange(field, password);
        setVisibility(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);
        onChange(field, e.target.value);
    };

    return (
        <FieldBase field={field} value={value} onChange={onChange} processing={processing} errors={errors}>
            <div className="flex rounded-md">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                    <Lock className="h-4 w-4" />
                </span>
                <Input
                    id={uniqueId}
                    type={visibility ? 'text' : 'password'}
                    required={field.required}
                    value={localValue}
                    onChange={handleChange}
                    disabled={processing}
                    placeholder={field.placeholder}
                    className="rounded-none"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-r-md rounded-l-none border border-l-0 border-input bg-muted text-muted-foreground hover:bg-muted"
                    onClick={toggleVisibility}
                >
                    {visibility ? (
                        <EyeOff className="h-4 w-4" />
                    ) : (
                        <Eye className="h-4 w-4" />
                    )}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-r-md border border-input bg-muted text-muted-foreground hover:bg-muted ml-2"
                    onClick={handleGeneratePassword}
                >
                    <KeyRound className="h-4 w-4" />
                </Button>
            </div>
        </FieldBase>
    );
} 