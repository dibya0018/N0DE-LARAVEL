import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Plus, Trash2, Pencil } from 'lucide-react';
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

import type { Project, BreadcrumbItem, UserCan } from '@/types';

import AppLayout from '@/layouts/app-layout';
import ProjectSettingsLayout from './layout';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
    project: Project;
    tokens: Array<{ id: number; name: string; abilities: string[]; created_at: string }>;
}

export default function APIAccessSettings({ project, tokens: initialTokens }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: project.name, href: route('projects.show', project.id) },
        { title: 'Settings', href: route('projects.settings.project', project.id) },
        { title: 'API Access', href: route('projects.settings.api-access', project.id) },
    ];

    const can = usePage().props.userCan as UserCan;

    const [tokens, setTokens] = useState(initialTokens);
    const [publicApi, setPublicApi] = useState<boolean>(project.public_api);

    const [showTokenDialog, setShowTokenDialog] = useState(false);
    const [editingToken, setEditingToken] = useState<{ id: number; name: string; abilities: string[] } | null>(null);
    const [newTokenName, setNewTokenName] = useState('');
    const [newTokenAbilities, setNewTokenAbilities] = useState<string[]>(['read']);
    const [createdPlainToken, setCreatedPlainToken] = useState<string | null>(null);

    const [tokenToDelete, setTokenToDelete] = useState<number|null>(null);

    const endpointUrl = `${window.location.origin}/api`;

    const copy = (value: string) => {
        navigator.clipboard.writeText(value);
        toast.success('Copied to clipboard');
    };

    const togglePublic = async () => {
        try {
            const res = await axios.post(route('projects.settings.toggle-public', project.id));
            setPublicApi(res.data.public_api);
            toast.success('Public API setting updated');
        } catch {
            toast.error('Failed');
        }
    };

    const resetDialogState = () => {
        setEditingToken(null);
        setCreatedPlainToken(null);
        setNewTokenName('');
        setNewTokenAbilities(['read']);
    };

    const saveToken = async () => {
        try {
            if (editingToken) {
                await axios.put(route('projects.settings.tokens.update', [project.id, editingToken.id]), {
                    name: newTokenName,
                    abilities: newTokenAbilities,
                });
                setTokens(tokens.map(t => t.id === editingToken.id ? { ...t, name: newTokenName, abilities: newTokenAbilities } : t));
                toast.success('Token updated');
                setShowTokenDialog(false);
                resetDialogState();
            } else {
                const res = await axios.post(route('projects.settings.tokens.create', project.id), {
                    name: newTokenName,
                    abilities: newTokenAbilities,
                });
                setTokens([...tokens, { id: res.data.token_id, name: newTokenName, abilities: newTokenAbilities, created_at: new Date().toISOString() }]);
                setCreatedPlainToken(res.data.token);
            }
        } catch (e: any) {
            toast.error('Failed to save token');
        }
    };

    const confirmDelete = async () => {
        if(tokenToDelete===null) return;
        try {
            await axios.delete(route('projects.settings.tokens.delete', [project.id, tokenToDelete]));
            setTokens(tokens.filter(t => t.id !== tokenToDelete));
            toast.success('Token deleted');
        } catch { toast.error('Failed'); }
        setTokenToDelete(null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="API Access settings" />

            <ProjectSettingsLayout project={project}>
                <div className="space-y-6 max-w-2xl">
                    <div>
                        <HeadingSmall title="Project ID" />
                        <div className="flex gap-2">
                            <Input readOnly value={project.uuid} />
                            <Button variant="outline" onClick={() => copy(project.uuid)}>
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <HeadingSmall title="Content API Endpoint" />
                        <div className="flex gap-2">
                            <Input readOnly value={endpointUrl} />
                            <Button variant="outline" onClick={() => copy(endpointUrl)}>
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-4">
                        <Label htmlFor="public_toggle">
                            {publicApi ? 'Disable Public GET access' : 'Enable Public GET access'}
                        </Label>
                        <Switch id="public_toggle" checked={publicApi} onCheckedChange={togglePublic} />
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                        <HeadingSmall title="Access Tokens" />
                        {can.access_api_access_settings && (
                            <Button size="sm" onClick={() => { resetDialogState(); setShowTokenDialog(true); }}>
                                <Plus className="w-4 h-4 mr-1" /> Create Token
                            </Button>
                        )}
                    </div>
                    
                    <div className="border rounded-md mt-4 ">
                        <table className="min-w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-4 py-2 text-left">Name</th>
                                    <th className="px-4 py-2 text-left">Abilities</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map((t) => (
                                    <tr key={t.id} className="border-t">
                                        <td className="px-4 py-2">{t.name}</td>
                                        <td className="px-4 py-2">{t.abilities.join(', ')}</td>
                                        <td className="px-4 py-2 text-right">
                                            {can.access_api_access_settings && (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingToken(t); setNewTokenName(t.name); setNewTokenAbilities(t.abilities); setShowTokenDialog(true); }}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setTokenToDelete(t.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {tokens.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                                            No tokens yet.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                        </table>
                    </div>

                    <Dialog open={showTokenDialog} onOpenChange={(open)=>{if(!open){setShowTokenDialog(false);resetDialogState();}}}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingToken ? 'Edit API Token' : 'Create API Token'}</DialogTitle>
                                <DialogDescription>Give the token a name and select abilities.</DialogDescription>
                            </DialogHeader>

                            {createdPlainToken ? (
                                <div className="space-y-3">
                                    <p className="text-sm">Copy your new token now. You won't see it again!  If you lose it, you can create a new one.</p>
                                    <div className="flex gap-2">
                                        <Input readOnly value={createdPlainToken} />
                                        <Button variant="outline" onClick={() => copy(createdPlainToken!)}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input value={newTokenName} onChange={(e) => setNewTokenName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Abilities</Label>
                                        <div className="flex items-center gap-4">
                                            {['create', 'read', 'update', 'delete'].map((a) => (
                                                <label key={a} className="flex items-center gap-2 text-sm cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newTokenAbilities.includes(a)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setNewTokenAbilities([...newTokenAbilities, a]);
                                                            else setNewTokenAbilities(newTokenAbilities.filter((ab) => ab !== a));
                                                        }}
                                                    />
                                                    {a}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                <Button variant="secondary" onClick={() => setShowTokenDialog(false)}>Close</Button>
                                {!createdPlainToken && (
                                    <Button onClick={saveToken} disabled={!newTokenName.trim()}>{editingToken ? 'Save' : 'Create'}</Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <AlertDialog open={tokenToDelete!==null} onOpenChange={(open)=>{if(!open) setTokenToDelete(null);}}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Token</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete this token? Applications using it will stop working.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </ProjectSettingsLayout>
        </AppLayout>
    );
} 