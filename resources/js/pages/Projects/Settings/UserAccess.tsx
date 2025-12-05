import { Head, Link } from '@inertiajs/react';

import type { Project, BreadcrumbItem } from '@/types/index.d';

import AppLayout from '@/layouts/app-layout';
import ProjectSettingsLayout from './layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import MultiSelect from '@/components/ui/select/Select';
import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
    project: Project;
}

type ProjectWithMembers = Project & { members: any[] };

export default function UsersRolesSettings({ project: initialProject }: Props) {
    const [project, setProject] = useState<ProjectWithMembers>(initialProject as ProjectWithMembers);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userOptions, setUserOptions] = useState<any[]>([]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: project.name, href: route('projects.show', project.id) },
        { title: 'Settings', href: route('projects.settings.project', project.id) },
        { title: 'User Access', href: route('projects.settings.user-access', project.id) },
    ];

    const handleInputChange = (input: string) => {
        if (!input) {
            setUserOptions([]);
            return input;
        }

        axios
            .get('/user-management/api/users', { params: { search: input, per_page: 10 } })
            .then((res) => {
                const memberIds = project.members?.map((m) => m.id) || [];
                const opts = res.data.data
                    .filter((u: any) => !memberIds.includes(u.id))
                    .map((u: any) => ({ value: u.id, label: `${u.name} <${u.email}>` }));
                setUserOptions(opts);
            });

        return input; // important: return the input string, not a Promise
    };

    const addMember = async () => {
        if (!selectedUser) return;
        try {
            const res = await axios.post(route('projects.settings.members.add', project.id), { user_id: selectedUser.value });
            setProject(res.data as ProjectWithMembers);
            setSelectedUser(null);
            toast.success('Member added');
        } catch (e) {
            toast.error('Failed to add member');
        }
    };

    const removeMember = async (userId: number) => {
        try {
            const res = await axios.delete(route('projects.settings.members.remove', [project.id, userId]));
            setProject(res.data as ProjectWithMembers);
            toast.success('Member removed');
        } catch (e) {
            toast.error('Failed to remove member');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Access" />

            <ProjectSettingsLayout project={project}>
                <div className="space-y-8 max-w-2xl">
                    <HeadingSmall title="User Access" description="Grant or revoke access to this project" />

                    {/* Members table */}
                    <div className="border rounded-md overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-3 py-2 text-left">Name</th>
                                    <th className="px-3 py-2 text-left">Email</th>
                                    <th className="px-3 py-2">Roles</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {project.members?.map(member => (
                                    <tr key={member.id} className="border-t">
                                        <td className="px-3 py-2 whitespace-nowrap">{member.name}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{member.email}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{member.roles?.map((r: any) => r.name).join(', ')}</td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">
                                            <Button size="icon" variant="ghost" className="text-red-600" onClick={() => removeMember(member.id)}>
                                                ✕
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {(!project.members || project.members.length === 0) && (
                                    <tr><td className="px-3 py-2 text-muted-foreground" colSpan={4}>No members yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-2 items-center mt-4 w-full">
                        <MultiSelect
                            value={selectedUser}
                            onChange={setSelectedUser}
                            onInputChange={handleInputChange}
                            options={userOptions}
                            placeholder="Search users..."
                            isClearable
                            className="w-full"
                        />
                        <Button disabled={!selectedUser} onClick={addMember}>Add</Button>
                    </div>
                </div>
            </ProjectSettingsLayout>
        </AppLayout>
    );
} 