import { Head } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Download, Upload, FileJson, FileSpreadsheet } from 'lucide-react';

import type { Project, BreadcrumbItem, Collection } from '@/types/index.d';

import AppLayout from '@/layouts/app-layout';
import ProjectSettingsLayout from './layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface Props {
    project: Project & {
        collections: Collection[];
    };
}

export default function ExportImportPage({ project }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: project.name,
            href: route('projects.show', project.id),
        },
        {
            title: 'Settings',
            href: route('projects.settings.project', project.id),
        },
        {
            title: 'Export/Import',
            href: route('projects.settings.export-import', project.id),
        },
    ];

    const [exporting, setExporting] = useState(false);
    const [includeCollections, setIncludeCollections] = useState(true);
    const [includeContent, setIncludeContent] = useState(false);

    const handleExportProject = async () => {
        setExporting(true);
        try {
            const response = await axios.post(
                route('projects.settings.export-import.export-project', project.id),
                {
                    include_collections: includeCollections,
                    include_content: includeContent,
                },
                {
                    responseType: 'blob',
                }
            );

            const blob = new Blob([response.data], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Create a safe filename from project name
            const safeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `project-${project.id}`;
            a.download = `project_${safeName}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('Project exported successfully');
        } catch (error) {
            toast.error('Failed to export project');
            console.error(error);
        } finally {
            setExporting(false);
        }
    };

    const [exportingCollection, setExportingCollection] = useState<number | null>(null);
    const [includeCollectionContent, setIncludeCollectionContent] = useState<Record<number, boolean>>({});

    const handleExportCollection = async (collection: Collection) => {
        setExportingCollection(collection.id);
        try {
            const response = await axios.post(
                route('projects.settings.export-import.export-collection', {
                    project: project.id,
                    collection: collection.id,
                }),
                {
                    include_content: includeCollectionContent[collection.id] ?? false,
                },
                {
                    responseType: 'blob',
                }
            );

            const blob = new Blob([response.data], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `collection_${collection.slug}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Collection "${collection.name}" exported successfully`);
        } catch (error) {
            toast.error('Failed to export collection');
            console.error(error);
        } finally {
            setExportingCollection(null);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Export/Import" />

            <ProjectSettingsLayout project={project}>
                <div className="space-y-6 max-w-4xl">
                    <HeadingSmall
                        title="Export/Import"
                        description="Export project structure and content, or import from JSON files"
                    />

                    {/* Export Project Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Export Project</CardTitle>
                            <CardDescription>
                                Export your project structure (collections, fields) and optionally content to a JSON file
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-start space-x-2">
                                    <Checkbox
                                        id="include_collections"
                                        checked={includeCollections}
                                        onCheckedChange={(checked) => setIncludeCollections(!!checked)}
                                        className='mt-1'
                                    />
                                    <div className="space-y-1">
                                        <Label htmlFor="include_collections" className="font-medium">
                                            Include Collections
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Export collection structure and field definitions
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-2">
                                    <Checkbox
                                        id="include_content"
                                        checked={includeContent}
                                        onCheckedChange={(checked) => setIncludeContent(!!checked)}
                                        disabled={!includeCollections}
                                        className='mt-1'
                                    />
                                    <div className="space-y-1">
                                        <Label htmlFor="include_content" className="font-medium">
                                            Include Content
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Export published content entries (requires collections to be included)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleExportProject}
                                disabled={exporting || !includeCollections}
                                className="w-full sm:w-auto"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                {exporting ? 'Exporting...' : 'Export Project'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Export Individual Collections */}
                    {project.collections && project.collections.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Export Collection Structure</CardTitle>
                                <CardDescription>
                                    Export individual collection structure (fields and configuration) to JSON
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {project.collections.map((collection) => (
                                        <div
                                            key={collection.id}
                                            className="flex flex-col gap-3 p-3 border rounded-md"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{collection.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Slug: {collection.slug}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleExportCollection(collection)}
                                                    disabled={exportingCollection === collection.id}
                                                >
                                                    <Download className="mr-2 h-4 w-4" />
                                                    {exportingCollection === collection.id ? 'Exporting...' : 'Export'}
                                                </Button>
                                            </div>
                                            <div className="flex items-start space-x-2">
                                                <Checkbox
                                                    id={`include_content_${collection.id}`}
                                                    checked={includeCollectionContent[collection.id] ?? false}
                                                    onCheckedChange={(checked) => {
                                                        setIncludeCollectionContent({
                                                            ...includeCollectionContent,
                                                            [collection.id]: !!checked,
                                                        });
                                                    }}
                                                    className='mt-1'
                                                />
                                                <div className="space-y-1">
                                                    <Label htmlFor={`include_content_${collection.id}`} className="font-medium text-sm">
                                                        Include Content
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        Export published content entries along with the collection structure
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Import Project Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Import Project</CardTitle>
                            <CardDescription>
                                Import a project from a JSON file when creating a new project. Use the project creation
                                modal and select "Import from file" option.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <FileJson className="h-4 w-4" />
                                <span>
                                    Go to the project creation modal and choose "Import from file" to import a project
                                    structure.
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </ProjectSettingsLayout>
        </AppLayout>
    );
}

