import { Head } from '@inertiajs/react';
import type { Project, BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import ProjectSettingsLayout from './layout';
import { useState } from 'react';

interface Props {
    project: Project;
    webhook: { id: number; name: string };
    logs: {
        data: Array<{ id:number; status:string; action:string; created_at:string; url?:string; request?:any; response:any }>;
        links: any;
    };
}

export default function WebhookLogsPage({ project, webhook, logs }: Props) {
    const [selectedLog, setSelectedLog] = useState<typeof logs.data[0] | null>(null);
    const breadcrumbs: BreadcrumbItem[] = [
        { title: project.name, href: route('projects.show', project.id) },
        { title: 'Settings', href: route('projects.settings.project', project.id) },
        { title: 'Webhooks', href: route('projects.settings.webhooks', project.id) },
        { title: 'Logs', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Webhook Logs - ${webhook.name}`} />

            <ProjectSettingsLayout project={project}>
                <h2 className="text-xl font-semibold mb-4">Logs for {webhook.name}</h2>
                <div className="border rounded-md overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="px-4 py-2 text-left">Date</th>
                                <th className="px-4 py-2 text-left">Event</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-left">URL</th>
                                <th className="px-4 py-2 text-left">Response</th>
                                <th className="px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.data.map(l => (
                                <tr key={l.id} className="border-t">
                                    <td className="px-4 py-2">{new Date(l.created_at).toLocaleString()}</td>
                                    <td className="px-4 py-2">{l.action}</td>
                                    <td className="px-4 py-2">
                                        {(() => {
                                            const code = typeof l.status === 'number' ? l.status : parseInt(l.status as any, 10);
                                            const variant = isNaN(code)
                                                ? 'secondary'
                                                : code < 400
                                                    ? 'default'
                                                    : 'destructive';
                                            return (
                                                <Badge variant={variant}>{l.status}</Badge>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-2 truncate max-w-[200px]" title={l.url}>{l.url?.slice(0,40)}</td>
                                    <td className="px-4 py-2 truncate max-w-[300px]" title={typeof l.response === 'string' ? l.response : JSON.stringify(l.response)}>
                                        {typeof l.response === 'string' ? l.response : JSON.stringify(l.response).slice(0,120)+'...'}
                                    </td>
                                    <td className="px-4 py-2">
                                        <Button size="sm" variant="secondary" onClick={()=>setSelectedLog(l)}>View</Button>
                                    </td>
                                </tr>
                            ))}
                            {logs.data.length===0 && (
                                <tr><td className="px-4 py-6 text-muted-foreground" colSpan={4}>No logs yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Detail Dialog */}
                <Dialog open={!!selectedLog} onOpenChange={(open)=>!open && setSelectedLog(null)}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Webhook Call Details</DialogTitle>
                            <DialogDescription className='sr-only'></DialogDescription>
                        </DialogHeader>
                        {selectedLog && (
                            <ScrollArea className="h-[60vh] pr-4">
                                <div className="space-y-4 text-sm">
                                    <div>
                                        <h3 className="font-medium">General</h3>
                                        <p><strong>Date:</strong> {new Date(selectedLog.created_at).toLocaleString()}</p>
                                        <p><strong>Event:</strong> {selectedLog.action}</p>
                                        <p><strong>Status:</strong> {selectedLog.status}</p>
                                        {selectedLog.url && <p><strong>URL:</strong> {selectedLog.url}</p>}
                                    </div>
                                    {selectedLog.request && (
                                        <div>
                                            <h3 className="font-medium">Request Payload</h3>
                                            <pre className="bg-muted rounded p-3 whitespace-pre-wrap text-xs">{JSON.stringify(selectedLog.request, null, 2)}</pre>
                                        </div>
                                    )}
                                    {selectedLog.response && (
                                        <div>
                                            <h3 className="font-medium">Response</h3>
                                            <pre className="bg-muted rounded p-3 whitespace-pre-wrap text-xs">{typeof selectedLog.response === 'string' ? selectedLog.response : JSON.stringify(selectedLog.response, null, 2)}</pre>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                        <DialogFooter>
                            <Button onClick={()=>setSelectedLog(null)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </ProjectSettingsLayout>
        </AppLayout>
    );
} 