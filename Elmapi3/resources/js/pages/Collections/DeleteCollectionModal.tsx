import { useForm } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Collection } from '@/types/index.d';
import InputError from '@/components/input-error';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: number;
    collection: Collection;
    onCollectionDeleted?: () => void;
}

export default function DeleteCollectionModal({ open, onOpenChange, projectId, collection, onCollectionDeleted }: Props) {
    const { data, setData, delete: destroy, processing, errors, reset } = useForm({
        slug: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        destroy(route('projects.collections.destroy', [projectId, collection.id]), {
            onSuccess: () => {
                reset();
                onOpenChange(false);
                onCollectionDeleted?.();
            },
        });
    };

    if (!collection) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Delete Collection</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the collection
                        and all its associated data.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <div>Please type <span className="font-mono bg-muted px-1 py-0.5 rounded border border-input inline-block  select-all">{collection.slug}</span> to confirm</div>
                        <Input
                            id="slug"
                            value={data.slug}
                            onChange={(e) => setData('slug', e.target.value)}
                            required
                            placeholder="Enter collection slug"
                        />
                        <InputError message={errors.slug} />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={processing || data.slug !== collection.slug}
                        >
                            Delete Collection
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 