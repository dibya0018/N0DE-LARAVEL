import { useForm, router } from '@inertiajs/react';
import { ActionMeta } from 'react-select'
import axios from 'axios';
import { useState, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import MultiSelect from '@/components/ui/select/Select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import InputError from '@/components/input-error';
import locales from '@/lib/locales.json'
import { Upload } from 'lucide-react';
type LocaleOption = {
    value: string;
    label: string;
};

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CreateProjectModal({ open, onOpenChange }: Props) {
    const localeOptions: LocaleOption[] = Object.entries(locales).map(([value, label]) => ({
        value,
        label: `${value} - ${label}`,
    }));

    const setLocale = (
        newValue: unknown,
        _actionMeta: ActionMeta<unknown>
    ) => {
        const option = newValue as LocaleOption | null;
        setData('default_locale', option ? option.value : '');
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        description: '',
        default_locale: 'en',
        template_slug: '',
        create_type: 'blank',
        with_demo_data: false as boolean,
        import_file: null as File | null,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Template options
    const [templates, setTemplates] = useState<{slug:string,name:string,description?:string,has_demo_data?:boolean}[]>([]);

    // Prepare options for the template dropdown once they are fetched
    const templateOptions = templates.map((t) => ({
        value: t.slug,
        label: t.name,
    }));

    useEffect(()=>{
        if (open) {
            axios.get(route('project-templates.index'))
                .then(res=> setTemplates(res.data))
                .catch(()=> setTemplates([]));
        }
    }, [open]);

    const selectedTemplate = templates.find((t) => t.slug === data.template_slug);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (data.create_type === 'import' && data.import_file) {
            // Use Inertia's post method which handles redirects automatically
            post(route('projects.import'), {
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
            post(route('projects.store'), {
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader className='border-b pb-3'>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription className='sr-only'>
                        Fill in the details below to create a new project.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            placeholder="Enter project name"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Enter project description"
                        />
                        <InputError message={errors.description} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="default_locale">Default Locale</Label>
                        <MultiSelect
                            defaultValue={localeOptions.find((opt) => opt.value === data.default_locale)}
                            isSearchable={true}
                            isClearable={true}
                            options={localeOptions}
                            onChange={setLocale}
                            />
                      
                        <InputError message={errors.default_locale} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="project_type">Project Type</Label>
                        <RadioGroup
                            value={data.create_type}
                            onValueChange={(value) => {
                                setData('create_type', value);
                                if (value === 'blank') {
                                    setData('template_slug', '');
                                    setData('with_demo_data', false);
                                    setData('import_file', null);
                                } else if (value === 'import') {
                                    setData('template_slug', '');
                                    setData('with_demo_data', false);
                                } else {
                                    setData('import_file', null);
                                }
                            }}
                            className="grid gap-2"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div className="flex items-start space-x-2 p-4 rounded-md border border-dashed border-gray-600 dark:border-gray-400">
                                    <RadioGroupItem value="blank" id="type_blank" className="mt-1" />
                                    <div className="space-y-1">
                                        <Label htmlFor="type_blank" className="font-medium">Blank</Label>
                                        <p className="text-sm text-muted-foreground">Start from scratch without a template.</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-2 p-4 rounded-md border border-dashed border-gray-600 dark:border-gray-400">
                                    <RadioGroupItem value="template" id="type_template" className="mt-1" />
                                    <div className="space-y-1">
                                        <Label htmlFor="type_template" className="font-medium">Choose from a template</Label>
                                        <p className="text-sm text-muted-foreground">Start with a predefined template.</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-2 p-4 rounded-md border border-dashed border-gray-600 dark:border-gray-400">
                                    <RadioGroupItem value="import" id="type_import" className="mt-1" />
                                    <div className="space-y-1">
                                        <Label htmlFor="type_import" className="font-medium">Import from file</Label>
                                        <p className="text-sm text-muted-foreground">Import project structure from JSON file.</p>
                                    </div>
                                </div>
                            </div>
                        </RadioGroup>

                        {data.create_type === 'template' && (
                            <div className="space-y-2 pt-2">
                                <Label htmlFor="template_select">Template</Label>
                                <MultiSelect
                                    defaultValue={templateOptions.find((opt) => opt.value === data.template_slug)}
                                    isSearchable
                                    isClearable
                                    options={templateOptions}
                                    onChange={(newValue: unknown, _actionMeta: ActionMeta<unknown>) => {
                                        const option = newValue as { value: string } | null;
                                        setData('template_slug', option ? option.value : '');
                                        setData('with_demo_data', false);
                                    }}
                                />
                                <InputError message={errors.template_slug} />
                            </div>
                        )}

                        {data.create_type === 'template' && selectedTemplate?.has_demo_data && (
                            <div className="flex items-start space-x-2 p-4 rounded-md border border-dashed border-gray-600 dark:border-gray-400">
                                <Checkbox
                                    id="with_demo_data"
                                    checked={data.with_demo_data}
                                    onCheckedChange={(checked) => setData('with_demo_data', !!checked)}
                                    className='mt-1'
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="with_demo_data" className="font-medium">Include demo content</Label>
                                    <p className="text-sm text-muted-foreground">
                                        This will include demo content in your project.
                                    </p>
                                </div>
                            </div>
                        )}

                        {data.create_type === 'import' && (
                            <div className="space-y-2 pt-2">
                                <Label htmlFor="import_file">Import File (JSON)</Label>
                                <div className="flex items-center space-x-2">
                                    <Input
                                        ref={fileInputRef}
                                        id="import_file"
                                        type="file"
                                        accept=".json"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setData('import_file', file);
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
                        )}
                    </div>

                    <DialogFooter className='border-t pt-3'>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Create Project
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 