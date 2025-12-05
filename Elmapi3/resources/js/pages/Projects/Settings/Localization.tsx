import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

import type { Project, BreadcrumbItem } from '@/types/index.d';

import AppLayout from '@/layouts/app-layout';
import ProjectSettingsLayout from './layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import MultiSelect from '@/components/ui/select/Select';

// Locales JSON map
import localesMap from '@/lib/locales.json';
import { Trash2 } from 'lucide-react';

type ProjectWithLocales = Project & { locales: string[] };

interface Props {
    project: Project;
}

export default function LocalizationSettings({ project: initialProject }: Props) {
    const [project, setProject] = useState<ProjectWithLocales>(initialProject as ProjectWithLocales);
    const [selectedLocale, setSelectedLocale] = useState<any>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: project.name, href: route('projects.show', project.id) },
        { title: 'Settings', href: route('projects.settings.project', project.id) },
        { title: 'Localization', href: route('projects.settings.localization', project.id) },
    ];

    const localesArray = Array.isArray(project.locales) ? project.locales : (project.locales ? [project.locales as unknown as string] : []);

    const availableLocaleOptions = useMemo(() => {
        return Object.entries(localesMap)
            .filter(([code]) => !localesArray.includes(code))
            .map(([code, name]) => ({ value: code, label: `${code} - ${name}` }));
    }, [project]);

    const addLocale = async () => {
        if (!selectedLocale) return;
        try {
            const res = await axios.post(route('projects.settings.locales.add', project.id), {
                locale: selectedLocale.value,
            });
            setProject(res.data as ProjectWithLocales);
            setSelectedLocale(null);
            toast.success('Locale added');
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to add locale');
        }
    };

    const setDefault = async (locale: string) => {
        try {
            const res = await axios.put(route('projects.settings.locales.default', project.id), { locale });
            setProject(res.data as ProjectWithLocales);
            toast.success('Default locale updated');
        } catch (e: any) {
            toast.error('Failed to update default locale');
        }
    };

    const deleteLocale = async (locale: string) => {
        try {
            const res = await axios.delete(route('projects.settings.locales.delete', [project.id, locale]));
            setProject(res.data as ProjectWithLocales);
            toast.success('Locale deleted');
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to delete locale');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Localization settings" />

            <ProjectSettingsLayout project={project}>
                <div className="space-y-10 max-w-2xl">
                    {/* Existing locales */}
                    <div>
                        <HeadingSmall title="Available Locales" />
                        <div className="mt-4 overflow-x-auto border rounded-md">
                            <table className="min-w-full text-sm">
                                <tbody>
                                    {localesArray.map((loc) => (
                                        <tr key={loc} className="border-b last:border-b-0">
                                            <td className="px-4 py-2 whitespace-nowrap">{loc}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{(localesMap as any)[loc] || '-'}</td>
                                            <td className="px-4 py-2 text-center whitespace-nowrap">
                                                {loc === project.default_locale ? (
                                                    <span className="font-medium">Default</span>
                                                ) : (
                                                    <Button variant="link" className="px-2" onClick={() => setDefault(loc)}>
                                                        Set as default
                                                    </Button>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-center whitespace-nowrap">
                                                {loc !== project.default_locale && (
                                                    <Button variant="ghost" size="icon" className="text-red-600" onClick={() => deleteLocale(loc)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {localesArray.length === 0 && (
                                        <tr>
                                            <td className="px-4 py-2 text-muted-foreground" colSpan={4}>No locales yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <Separator />

                    {/* Add locale */}
                    <div>
                        <HeadingSmall title="Add a Locale" />
                        <div className="mt-4 flex gap-2 w-full">
                            <MultiSelect
                                value={selectedLocale}
                                onChange={setSelectedLocale}
                                options={availableLocaleOptions}
                                placeholder="Select locale"
                                classNamePrefix="react-select"
                                className="w-full"
                            />
                            <Button onClick={addLocale} disabled={!selectedLocale}>Add</Button>
                        </div>
                    </div>
                </div>
            </ProjectSettingsLayout>
        </AppLayout>
    );
} 