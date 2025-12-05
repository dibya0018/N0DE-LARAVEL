import { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';

import type { Collection, Project, Field, BreadcrumbItem, UserCan } from '@/types/index.d';

import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Copy, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import ProjectSidebar from '../Projects/ProjectSidebar';
import FieldList from './Fields/FieldList';
import AddFieldModal from './Fields/AddFieldModal';
import ProjectsLayout from '../Projects/layout';

interface Props {
    project: Project & {
        collections: Collection[];
    };
    collection: Collection & {
        fields: Field[];
    }
}

export default function Edit({ project, collection }: Props) {
    const can = usePage().props.userCan as UserCan;
    
    const [copied, setCopied] = useState(false);
    const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateName, setTemplateName] = useState(collection.name);

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveTemplate = async () => {
        try {
            await axios.post(route('collections.saveAsTemplate', [project.id, collection.id]), { name: templateName });
            setTemplateModalOpen(false);
            toast.success('Template saved');
        } catch (e) {
            console.error(e);
            toast.error('Failed to save template');
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: project.name,
            href: route('projects.show', project.id),
        },
        {
            title: collection.name,
            href: route('projects.collections.show', [project.id, collection.id]),
        },
        {
            title: 'Edit Collection',
            href: route('projects.collections.edit', [project.id, collection.id]),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={collection.name} />

            <ProjectsLayout>
                <ProjectSidebar project={project} />

                <Separator className="my-6 md:hidden" />

                <div className="flex-1 max-w-full md:w-2xl lg:w-xl xl:w-3xl">
                    <section className="space-y-12">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <FieldList
                                projectId={project.id}
                                collectionId={collection.id}
                                initialFields={collection.fields}
                                onAddFieldClick={() => setIsAddFieldModalOpen(true)}
                                collections={project.collections}
                                can={can}
                            />
                            <Card className="w-full lg:w-[240px]">
                                <CardHeader>
                                    <CardTitle>{collection.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-medium">UUID</h3>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-muted-foreground">{collection.uuid}</p>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => copyToClipboard(collection.uuid)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                    <span className="sr-only">Copy UUID</span>
                                                </Button>
                                                {copied && (
                                                    <span className="text-xs text-green-500">Copied!</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Slug</h3>
                                            <p className="text-sm text-muted-foreground">{collection.slug}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Created At</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(collection.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Last Updated</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(collection.updated_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <Button variant="default" className="w-full flex items-center justify-center gap-2" onClick={() => setTemplateModalOpen(true)}>
                                            <Save className="h-4 w-4" />
                                            <span>Save as Template</span>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                </div>
            </ProjectsLayout>

            <AddFieldModal
                isOpen={isAddFieldModalOpen}
                onClose={() => setIsAddFieldModalOpen(false)}
                collectionId={collection.id}
                projectId={project.id}
                collections={project.collections}
                collectionFields={collection.fields}
                can={can}
            />

            <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Collection as Template</DialogTitle>
                        <DialogDescription className="sr-only">Save Collection as Template</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTemplate}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 