import { useState, useRef, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'sonner';

import { BreadcrumbItem, Role, UserCan } from '@/types';

import AppLayout from '@/layouts/app-layout';
import UserManagementLayout from './layout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import InputError from '@/components/input-error';
import { Eye, EyeOff, Plus, Users, Shield, Key, Lock, Projector } from 'lucide-react';
import { DataTable, ColumnFilter, DataTableRef } from '@/components/ui/data-table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'User Management',
        href: '/user-management/users',
    },
    {
        title: 'Roles',
        href: '/user-management/roles',
    },
];

interface RolesPageProps {
    permissionGroups: {
        groups: PermissionGroup[];
        projects: ProjectPermission[];
    };
}

interface PermissionGroup {
    group: string;
    label: string;
    icon: string;
    permissions: string[];
}

interface ProjectPermission {
    name: string;
    permission: string;
    icon: string;
}

export default function Roles({ permissionGroups: initialPermissionGroups }: RolesPageProps) {
    const can = usePage().props.userCan as UserCan;
    
    const [openModal, setOpenModal] = useState(false);
    const [editing, setEditing] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [openBulkDeleteModal, setOpenBulkDeleteModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [bulkDeletePassword, setBulkDeletePassword] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedItems, setSelectedItems] = useState<Role[]>([]);
    const [bulkDeleteErrors, setBulkDeleteErrors] = useState<Record<string, string>>({});
    const dataTableRef = useRef<DataTableRef>(null);

    const routePrefix = '/user-management/api/roles';
    
    const [formData, setFormData] = useState({
        id: 0,
        name: '',
        permissions: [] as string[],
    });
    
    const resetForm = () => {
        setFormData({
            id: 0,
            name: '',
            permissions: [],
        });
        setErrors({});
    };
    
    const openNewModal = () => {
        resetForm();
        setEditing(false);
        setOpenModal(true);
    };
    
    const closeModal = () => {
        setOpenModal(false);
        setEditing(false);
        resetForm();
    };
    
    const handleSuccess = () => {
        dataTableRef.current?.fetchData();
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        
        try {
            if (editing) {
                const response = await axios.put(`${routePrefix}/${formData.id}`, formData);
                toast.success(response.data.message);
            } else {
                const response = await axios.post(routePrefix, formData);
                toast.success(response.data.message);
            }
            
            setOpenModal(false);
            setEditing(false);
            resetForm();
            handleSuccess();
        } catch (error: any) {
            if (error.response?.status === 422) {
                setErrors(error.response.data.errors);
            } else {
                toast.error('An error occurred');
            }
        } finally {
            setProcessing(false);
        }
    };
    
    const editItem = (item: Role) => {
        if (!can.update_roles) return;
        
        setFormData({
            id: item.id,
            name: item.name,
            permissions: item.permissions?.map(permission => permission.name) || [],
        });
        
        setEditing(true);
        setOpenModal(true);
    };
    
    const confirmDelete = () => {
        setOpenDeleteModal(true);
    };

    const confirmBulkDelete = () => {
        setOpenBulkDeleteModal(true);
    };
    
    const deleteItem = async () => {
        setProcessing(true);
        
        try {
            const response = await axios.delete(`${routePrefix}/${formData.id}`);
            toast.success(response.data.message);
            setOpenDeleteModal(false);
            closeModal();
            handleSuccess();
        } catch (error: any) {
            if (error.response?.status === 422) {
                toast.error(error.response.data.error);
                setOpenDeleteModal(false);
            } else {
                toast.error(error.response.data.error);
            }
        } finally {
            setProcessing(false);
        }
    };

    const deleteSelected = async () => {
        if (!bulkDeletePassword) {
            toast.error('Please enter your password to confirm deletion');
            return;
        }

        setProcessing(true);
        setBulkDeleteErrors({});
        
        try {
            const response = await axios.post(`${routePrefix}/bulk-delete`, {
                ids: selectedItems.map(item => item.id),
                password: bulkDeletePassword
            });
            toast.success(response.data.message);
            setOpenBulkDeleteModal(false);
            setSelectedItems([]);
            setBulkDeletePassword('');
            handleSuccess();
        } catch (error: any) {
            if (error.response?.status === 422) {
                if (error.response.data.errors) {
                    setBulkDeleteErrors(error.response.data.errors);
                } else if (error.response.data.error) {
                    toast.error(error.response.data.error);
                }
            } else if (error.response?.status === 403) {
                toast.error('Invalid password');
            } else {
                toast.error('An error occurred while deleting');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleSelectAll = (_group: string, permissions: string[], checked: boolean) => {
        setFormData(prev => {
            const newPermissions = [...prev.permissions];

            if (checked) {
                permissions.forEach(permission => {
                    if (!newPermissions.includes(permission)) {
                        newPermissions.push(permission);
                    }
                });
            } else {
                permissions.forEach(permission => {
                    const index = newPermissions.indexOf(permission);
                    if (index > -1) {
                        newPermissions.splice(index, 1);
                    }
                });
            }

            return { ...prev, permissions: newPermissions };
        });
    };

    const handleSelectAllProjects = (checked: boolean) => {
        setFormData(prev => {
            const newPermissions = [...prev.permissions];
            
            if (checked) {
                initialPermissionGroups.projects.forEach((permission: ProjectPermission) => {
                    if (!newPermissions.includes(permission.permission)) {
                        newPermissions.push(permission.permission);
                    }
                });
            } else {
                initialPermissionGroups.projects.forEach((permission: ProjectPermission) => {
                    const index = newPermissions.indexOf(permission.permission);
                    if (index > -1) {
                        newPermissions.splice(index, 1);
                    }
                });
            }
            
            return { ...prev, permissions: newPermissions };
        });
    };

    const tableColumns = [
        {
            header: 'Name',
            accessorKey: 'name',
            sortable: true,
            filter: {
                type: 'text' as const,
                placeholder: 'Filter by name...'
            } as ColumnFilter
        },
        {
            header: 'Permissions',
            accessorKey: 'permissions',
            cell: (item: Role) => (
                <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">
                        {item.permissions?.length || 0} permissions
                    </Badge>
                </div>
            ),
        },
        {
            header: 'Created At',
            accessorKey: 'created_at',
            sortable: true,
            filter: {
                type: 'date' as const,
                placeholder: 'Filter by creation date...'
            } as ColumnFilter,
            cell: (item: Role) => (
                <div className="text-sm text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                </div>
            ),
        },
        {
            header: 'Updated At',
            accessorKey: 'updated_at',
            sortable: true,
            filter: {
                type: 'date' as const,
                placeholder: 'Filter by update date...'
            } as ColumnFilter,
            cell: (item: Role) => (
                <div className="text-sm text-muted-foreground">
                    {new Date(item.updated_at).toLocaleString()}
                </div>
            ),
        },
    ];

    const tableActionButtons = [
        {
            label: 'Delete Selected',
            onClick: confirmBulkDelete,
            variant: 'destructive' as const,
            show: can.delete_roles && selectedItems.length > 0,
        },
        {
            label: 'Create Role',
            onClick: openNewModal,
            variant: 'default' as const,
            icon: <Plus className="h-4 w-4" />,
            show: can.create_roles,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles" />
            
            <UserManagementLayout can={can}>
                <div className="space-y-4">
                    <DataTable
                        ref={dataTableRef}
                        columns={tableColumns}
                        searchPlaceholder="Search roles..."
                        searchRoute={routePrefix}
                        actions={tableActionButtons.filter(button => button.show)}
                        selectable={can.delete_roles}
                        onSelectionChange={setSelectedItems}
                        selectedItems={selectedItems}
                        pageName="roles-table"
                        onRowClick={editItem}
                    />
                </div>
            </UserManagementLayout>
            
            <Dialog open={openModal} onOpenChange={(open) => {
                setOpenModal(open);
                if (!open) {
                    closeModal();
                }
            }}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center">
                            <span>{editing ? 'Edit Role' : 'Create New Role'}</span>
                            {editing && can.delete_roles && (
                                <Button variant="destructive" size="sm" onClick={confirmDelete}>
                                    Delete
                                </Button>
                            )}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editing ? 'Update role details below' : 'Fill in the form to create a new role'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={submitForm} className="space-y-4 max-h-[60vh] overflow-y-auto px-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                                className="max-w-md"
                            />
                            <InputError message={errors.name} />
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                                {initialPermissionGroups.groups.map((group: PermissionGroup) => {
                                    const Icon = {
                                        'Users': Users,
                                        'Shield': Shield,
                                        'Key': Key,
                                    }[group.icon] || Users;

                                    return (
                                        <div key={group.group} className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-5 w-5 text-primary" />
                                                    <span className="font-medium">{group.label}</span>
                                                </div>
                                                <Checkbox
                                                    checked={group.permissions.every((perm: string) => 
                                                        formData.permissions.includes(perm)
                                                    )}
                                                    onCheckedChange={(checked) => 
                                                        handleSelectAll(group.group, group.permissions, checked as boolean)
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2 pl-6">
                                                {group.permissions.map((permission: string) => (
                                                    <div key={permission} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`${permission}`}
                                                            checked={formData.permissions.includes(`${permission}`)}
                                                            onCheckedChange={(checked) => {
                                                                setFormData(prev => {
                                                                    const newPermissions = [...prev.permissions];
                                                                    if (checked) {
                                                                        newPermissions.push(permission);
                                                                    } else {
                                                                        const index = newPermissions.indexOf(permission);
                                                                        if (index > -1) {
                                                                            newPermissions.splice(index, 1);
                                                                        }
                                                                    }
                                                                    return { ...prev, permissions: newPermissions };
                                                                });
                                                            }}
                                                        />
                                                        <Label htmlFor={`${permission}`} className="text-sm">
                                                            {permission.charAt(0).toUpperCase() + permission.slice(1)}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <Projector className="h-5 w-5 text-primary" />
                                        <span className="font-medium">Projects</span>
                                    </div>
                                    <Checkbox
                                        checked={initialPermissionGroups.projects.every((perm: ProjectPermission) => 
                                            formData.permissions.includes(perm.permission)
                                        )}
                                        onCheckedChange={(checked) => 
                                            handleSelectAllProjects(checked as boolean)
                                        }
                                    />
                                </div>
                                <div className="space-y-2 pl-6">
                                    {initialPermissionGroups.projects.map((permission: ProjectPermission) => (
                                        <div key={permission.permission} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={permission.permission}
                                                checked={formData.permissions.includes(permission.permission)}
                                                onCheckedChange={(checked) => {
                                                    setFormData(prev => {
                                                        const newPermissions = [...prev.permissions];
                                                        if (checked) {
                                                            newPermissions.push(permission.permission);
                                                        } else {
                                                            const index = newPermissions.indexOf(permission.permission);
                                                            if (index > -1) {
                                                                newPermissions.splice(index, 1);
                                                            }
                                                        }
                                                        return { ...prev, permissions: newPermissions };
                                                    });
                                                }}
                                            />
                                            <Label htmlFor={permission.permission} className="text-sm">
                                                {permission.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <DialogFooter className="pt-4 border-t">
                            <Button type="submit" disabled={processing}>
                                {editing ? 'Update Role' : 'Create Role'}
                            </Button>
                            <Button type="button" variant="outline" onClick={closeModal}>
                                Cancel
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
            {/* Delete Confirmation Modal */}
            <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Are you sure you want to delete this role?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. The role will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDeleteModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={deleteItem} disabled={processing}>
                            Delete Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Confirmation Modal */}
            <Dialog open={openBulkDeleteModal} onOpenChange={(open) => {
                setOpenBulkDeleteModal(open);
                if (!open) {
                    setBulkDeletePassword('');
                    setBulkDeleteErrors({});
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Are you sure you want to delete {selectedItems.length} roles?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. The selected roles will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Enter your password to confirm</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={bulkDeletePassword}
                                    onChange={(e) => setBulkDeletePassword(e.target.value)}
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </button>
                            </div>
                            <InputError message={bulkDeleteErrors.password?.[0]} />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setOpenBulkDeleteModal(false);
                            setBulkDeletePassword('');
                            setBulkDeleteErrors({});
                        }}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={deleteSelected} 
                            disabled={processing || !bulkDeletePassword}
                        >
                            Delete Roles
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 