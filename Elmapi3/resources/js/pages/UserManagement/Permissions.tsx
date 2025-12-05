import { useState, useRef } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'sonner';

import { BreadcrumbItem, Permission, UserCan } from '@/types';

import AppLayout from '@/layouts/app-layout';
import UserManagementLayout from './layout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { DataTable, ColumnFilter, DataTableRef } from '@/components/ui/data-table';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'User Management',
        href: '/user-management/users',
    },
    {
        title: 'Permissions',
        href: '/user-management/permissions',
    },
];

export default function Permissions() {
    const can = usePage().props.userCan as UserCan;
    
    const [openModal, setOpenModal] = useState(false);
    const [editing, setEditing] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [openBulkDeleteModal, setOpenBulkDeleteModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [bulkDeletePassword, setBulkDeletePassword] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedItems, setSelectedItems] = useState<Permission[]>([]);
    const [bulkDeleteErrors, setBulkDeleteErrors] = useState<Record<string, string>>({});
    const dataTableRef = useRef<DataTableRef>(null);

    const routePrefix = '/user-management/api/permissions';
    
    const [formData, setFormData] = useState({
        id: 0,
        name: '',
    });
    
    const resetForm = () => {
        setFormData({
            id: 0,
            name: '',
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
            } else if (error.response?.status === 401) {
                toast.error(error.response.data.error);
            }  else {
                toast.error('An error occurred');
            }
        } finally {
            setProcessing(false);
        }
    };
    
    const editItem = (item: Permission) => {
        if (!can.update_permissions) return;
        
        setFormData({
            id: item.id,
            name: item.name,
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
            } else if (error.response?.status === 401) {
                toast.error(error.response.data.error);
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
            } else if (error.response?.status === 401) {
                toast.error(error.response.data.error);
            } else if (error.response?.status === 403) {
                toast.error('Invalid password');
            } else {
                toast.error('An error occurred while deleting');
            }
        } finally {
            setProcessing(false);
        }
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
            header: 'Created At',
            accessorKey: 'created_at',
            sortable: true,
            filter: {
                type: 'date' as const,
                placeholder: 'Filter by creation date...'
            } as ColumnFilter,
            cell: (item: Permission) => (
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
            cell: (item: Permission) => (
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
            show: can.delete_permissions && selectedItems.length > 0,
        },
        {
            label: 'Create Permission',
            onClick: openNewModal,
            variant: 'default' as const,
            icon: <Plus className="h-4 w-4" />,
            show: can.create_permissions,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Permissions" />
            
            <UserManagementLayout can={can}>
                <div className="space-y-4">
                    <DataTable
                        ref={dataTableRef}
                        columns={tableColumns}
                        searchPlaceholder="Search permissions..."
                        searchRoute={routePrefix}
                        actions={tableActionButtons.filter(button => button.show)}
                        selectable={can.delete_permissions}
                        onSelectionChange={setSelectedItems}
                        selectedItems={selectedItems}
                        pageName="permissions-table"
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center">
                            <span>{editing ? 'Edit Permission' : 'Create New Permission'}</span>
                            {editing && can.delete_permissions && (
                                <Button variant="destructive" size="sm" onClick={confirmDelete}>
                                    Delete
                                </Button>
                            )}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editing ? 'Update permission details below' : 'Fill in the form to create a new permission'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={submitForm} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                            <InputError message={errors.name} />
                        </div>
                        
                        <DialogFooter className="pt-4 border-t">
                            <Button type="submit" disabled={processing}>
                                {editing ? 'Update Permission' : 'Create Permission'}
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
                        <DialogTitle>Are you sure you want to delete this permission?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. The permission will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDeleteModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={deleteItem} disabled={processing}>
                            Delete Permission
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
                        <DialogTitle>Are you sure you want to delete {selectedItems.length} permissions?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. The selected permissions will be permanently deleted.
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
                            Delete Permissions
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 