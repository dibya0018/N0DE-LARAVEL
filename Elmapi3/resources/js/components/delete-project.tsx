import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import HeadingSmall from '@/components/heading-small';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Props {
    projectId: number;
    projectName: string;
}

export default function DeleteProject({ projectId, projectName }: Props) {
    const nameInput = useRef<HTMLInputElement>(null);
    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm<{ confirm_name: string }>({ confirm_name: '' });

    const deleteProject: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('projects.destroy', projectId), {
            preserveScroll: true,
        });
    };

    const closeModal = () => {
        clearErrors();
        reset();
    };

    const isConfirmed = data.confirm_name === projectName;

    return (
        <div className="space-y-6">
            <HeadingSmall title="Delete project" description="Delete this project and all of its resources" />
            <div className="space-y-4 rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-200/10 dark:bg-red-700/10">
                <div className="relative space-y-0.5 text-red-600 dark:text-red-100">
                    <p className="font-medium">Warning</p>
                    <p className="text-sm">This action cannot be undone. Type the project name to confirm.</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive">Delete project</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Are you sure you want to delete this project?</DialogTitle>
                        <DialogDescription>
                            Once the project is deleted, all of its collections, content, and assets will also be permanently deleted.
                        </DialogDescription>
                        <form className="space-y-6" onSubmit={deleteProject}>
                            <div className="space-y-2">
                                <div>Please type <span className="font-mono bg-muted px-1 py-0.5 rounded border border-input inline-block select-all">{projectName}</span> to confirm</div>
                                
                                <Input
                                    id="confirm_name"
                                    name="confirm_name"
                                    ref={nameInput}
                                    value={data.confirm_name}
                                    onChange={(e) => setData('confirm_name', e.target.value)}
                                    placeholder={projectName}
                                />

                                <InputError message={errors.confirm_name} />
                            </div>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button variant="secondary" onClick={closeModal} type="button">
                                        Cancel
                                    </Button>
                                </DialogClose>

                                <Button variant="destructive" disabled={processing || !isConfirmed} asChild>
                                    <button type="submit">Delete project</button>
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
} 