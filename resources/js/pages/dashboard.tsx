import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';

import { type BreadcrumbItem, type Project, type UserCan } from '@/types/index.d';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/ui/search-bar';

import CreateProjectModal from '@/pages/Projects/CreateProjectModal';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/',
    },
];

interface Props {
    projects: Project[];
}

export default function Dashboard({ projects }: Props) {
    const can = usePage().props.userCan as UserCan;
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProjects = projects.filter((project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search projects..."
                />
                
                <div className="grid auto-rows-min gap-4 sm:grid-cols-2 md:grid-cols-3  lg:grid-cols-5">
                    {/* Create Project Card */}
                    {can.create_project && (
                        <Button
                            variant="ghost"
                            className="h-full w-full flex flex-col items-center justify-center gap-2 border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border cursor-pointer"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <Plus className="h-8 w-8" />
                            <span>Create Project</span>
                        </Button>
                    )}

                    {/* Project Cards */}
                    {filteredProjects.map((project) => (
                        <Card
                            key={project.id}
                            className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => router.visit(route('projects.show', project.id))}
                        >
                            <CardHeader>
                                <CardTitle>{project.name}</CardTitle>
                                <CardDescription>
                                    {project.description || 'No description'}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ))}

                </div>
            </div>

            <CreateProjectModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            />
        </AppLayout>
    );
}
