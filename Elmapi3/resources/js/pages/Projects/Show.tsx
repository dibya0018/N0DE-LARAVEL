import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Copy, Save, Layers, FileText, Image, Webhook } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { toast } from 'sonner';

import { type Project, type BreadcrumbItem, UserCan } from '@/types/index.d';

import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { HardDrive, Globe, Users, Settings, Key, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

import ProjectSidebar from './ProjectSidebar';
import ProjectsLayout from './layout';

interface Props {
    project: Project;
}

export default function Show({ project }: Props) {
    const can = usePage().props.userCan as UserCan;

    const { copied, copyToClipboard } = useCopyToast();

    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateName, setTemplateName] = useState(project.name);
    const [templateDesc, setTemplateDesc] = useState(project.description ?? '');

    const [cloneModalOpen, setCloneModalOpen] = useState(false);
    const [cloneName, setCloneName] = useState(project.name + ' Copy');
    const [cloneDesc, setCloneDesc] = useState(project.description ?? '');

    const slugify = (str: string) => str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const handleSaveTemplate = async () => {
        try {
            await axios.post(route('projects.saveAsTemplate', project.id), {
                name: templateName,
                slug: slugify(templateName),
                description: templateDesc,
            });
            toast.success('Template saved');
            setTemplateModalOpen(false);
        } catch (e) {
            console.error(e);
            toast.error('Failed to save template');
        }
    };

    const handleCloneProject = async () => {
        try {
            const res = await axios.post(route('projects.clone', project.id), {
                name: cloneName,
                description: cloneDesc,
            });
            const redirect = res.data?.redirect;
            if (redirect) {
                window.location.href = redirect;
            } else {
                toast.success('Project cloned');
                setCloneModalOpen(false);
            }
        } catch (e) {
            console.error(e);
            toast.error('Failed to clone project');
        }
    };

    const diskLabel = project.disk === 'public' ? 'Local Storage' : project.disk.toUpperCase();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: project.name,
            href: '/project',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={project.name} />

            <ProjectsLayout>
                <ProjectSidebar project={project} />

                <Separator className="my-6 md:hidden" />

                <div className="flex-1 max-w-full md:w-2xl lg:w-xl xl:w-3xl">
                    <section className="space-y-6">
                        

                        <Card>
                            <CardHeader className="space-y-2">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <CardTitle className="text-2xl font-bold">{project.name}</CardTitle>
                                        <CardDescription>
                                            {project.description || 'No description'}
                                        </CardDescription>
                                    </div>
                                    {/* Badges and top-right actions */}
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="outline" className="flex items-center gap-1 cursor-default">
                                                    <HardDrive className="h-3 w-3" /> {diskLabel}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {project.disk === 'public'
                                                    ? 'Files stored on this server.'
                                                    : 'Amazon S3 storage'}
                                            </TooltipContent>
                                        </Tooltip>
                                        <Badge variant="outline" className="flex items-center gap-1">
                                            <Globe className="h-3 w-3" /> {project.default_locale.toUpperCase()}
                                        </Badge>
                                        {project.public_api && (
                                            <Badge variant="secondary" className="flex items-center gap-1">
                                                Public API
                                            </Badge>
                                        )}
                                        {/* Actions */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex items-center gap-1"
                                            onClick={() => setTemplateModalOpen(true)}
                                        >
                                            <Save className="h-4 w-4" />
                                            <span className="hidden sm:inline">Template</span>
                                        </Button>
                                        {can.create_project && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex items-center gap-1"
                                                onClick={() => setCloneModalOpen(true)}
                                            >
                                                <Copy className="h-4 w-4" />
                                                <span className="hidden sm:inline">Clone</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-3 justify-center mb-4">
                                    {can.access_assets && (
                                        <QuickAction icon={Image} label="Asset Library" href={route('assets.index', project.id)} />
                                    )}
                                    {can.access_project_settings && (
                                        <QuickAction icon={Settings} label="General Settings" href={route('projects.settings.project', project.id)} />
                                    )}
                                    {can.access_localization_settings && (
                                        <QuickAction icon={Globe} label="Localization" href={route('projects.settings.localization', project.id)} />
                                    )}
                                    {can.access_user_access_settings && (
                                        <QuickAction icon={Users} label="User Access" href={route('projects.settings.user-access', project.id)} />
                                    )}
                                    {can.access_api_access_settings && (
                                        <QuickAction icon={Key} label="API Access" href={route('projects.settings.api-access', project.id)} />
                                    )}
                                    {can.access_webhooks_settings && (
                                        <QuickAction icon={Webhook} label="Webhooks" href={route('projects.settings.webhooks', project.id)} />
                                    )}
                                    {can.access_project_settings && (
                                        <QuickAction icon={Download} label="Export/Import" href={route('projects.settings.export-import', project.id)} />
                                    )}
                                </div>
                                <div className='flex flex-wrap gap-3 justify-between'>
                                    <div className="space-y-5">
                                        <div>
                                            <h3 className="text-sm font-medium">Project ID</h3>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-muted-foreground break-all">{project.uuid}</p>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => copyToClipboard(project.uuid)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                    <span className="sr-only">Copy UUID</span>
                                                </Button>
                                                {copied && <span className="text-xs text-green-500">Copied!</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Storage</h3>
                                            <p className="text-sm text-muted-foreground uppercase">{diskLabel}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Default Locale</h3>
                                            <p className="text-sm text-muted-foreground uppercase">
                                                {project.default_locale}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Available Locales</h3>
                                            <p className="text-sm text-muted-foreground uppercase">
                                                {(project.locales?.length ? project.locales.join(', ') : project.default_locale).toUpperCase()}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Public API</h3>
                                            <p className="text-sm text-muted-foreground uppercase">
                                                {project.public_api ? <Badge variant="default" className="flex items-center gap-1">
                                                    Enabled
                                                </Badge> : <Badge variant="outline" className="flex items-center gap-1">
                                                    Disabled
                                                </Badge>}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Created At</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(project.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Last Updated</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(project.updated_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className='space-y-3'>
                                        <div className='text-center border border-dashed rounded-md p-4'>
                                            <StatsItem
                                                icon={Layers}
                                                label="Collections"
                                                value={project.collections_count ?? project.collections?.length ?? 0}
                                            />
                                        </div>

                                        <div className='text-center border border-dashed rounded-md p-4'>
                                            <StatsItem
                                                icon={FileText}
                                                label="Content Entries"
                                                value={project.content_count ?? 0}
                                            />
                                        </div>

                                        <div className='text-center border border-dashed rounded-md p-4'>
                                            <StatsItem
                                                icon={Image}
                                                label="Assets"
                                                value={project.assets_count ?? 0}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </ProjectsLayout>

            {/* Save Template Modal */}
            <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Project as Template</DialogTitle>
                        <DialogDescription className="sr-only">Save Project as Template</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="tpl_name">Template Name</label>
                            <Input id="tpl_name" value={templateName} onChange={e => setTemplateName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="tpl_desc">Description</label>
                            <Textarea id="tpl_desc" value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTemplate}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Clone Project Modal */}
            <Dialog open={cloneModalOpen} onOpenChange={setCloneModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Clone Project</DialogTitle>
                        <DialogDescription className="sr-only">Clone Project</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="clone_name">New Project Name</label>
                            <Input id="clone_name" value={cloneName} onChange={e => setCloneName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="clone_desc">Description</label>
                            <Textarea id="clone_desc" value={cloneDesc} onChange={e => setCloneDesc(e.target.value)} rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCloneModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCloneProject}>Clone</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function useCopyToast() {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Failed to copy', e);
        }
    };

    return { copied, copyToClipboard };
}

interface StatsItemProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number;
}

function StatsItem({ icon: Icon, label, value }: StatsItemProps) {
    return (
        <div className="space-y-2">
            <Icon className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
        </div>
    );
}

interface QuickActionProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    href: string;
}

function QuickAction({ icon: Icon, label, href }: QuickActionProps) {
    return (
        <Link href={href} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
            <Icon className="h-4 w-4" /> {label}
        </Link>
    );
}