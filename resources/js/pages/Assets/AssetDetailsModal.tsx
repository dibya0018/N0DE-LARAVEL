import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useForm } from '@inertiajs/react';
import axios from 'axios';

import { Project, Asset } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {  Dialog,  DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileImage, FileText, FileVideo, FileAudio, File, Download, Crop, Lock, Unlock, Copy, Check } from 'lucide-react';
import ReactCrop, { Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import InputError from '@/components/input-error';

interface AssetDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    asset: Asset;
    onUpdate?: (updatedAsset: Asset) => void;
}

export default function AssetDetailsModal({
    isOpen,
    onClose,
    project,
    asset: initialAsset,
    onUpdate
}: AssetDetailsModalProps) {
    const [isCropping, setIsCropping] = useState(false);
    const [crop, setCrop] = useState<CropType>();
    const [completedCrop, setCompletedCrop] = useState<CropType>();
    const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
    const [asset, setAsset] = useState(initialAsset);
    const [copied, setCopied] = useState(false);
    const [copiedUuid, setCopiedUuid] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const [submitting, setSubmitting] = useState(false);

    const { data, setData, errors, reset } = useForm({
        alt_text: initialAsset.metadata?.alt_text || '',
        title: initialAsset.metadata?.title || '',
        caption: initialAsset.metadata?.caption || '',
        description: initialAsset.metadata?.description || '',
        author: initialAsset.metadata?.author || '',
        copyright: initialAsset.metadata?.copyright || '',
    });

    // Update form data when initialAsset changes
    useEffect(() => {
        setData({
            alt_text: initialAsset.metadata?.alt_text || '',
            title: initialAsset.metadata?.title || '',
            caption: initialAsset.metadata?.caption || '',
            description: initialAsset.metadata?.description || '',
            author: initialAsset.metadata?.author || '',
            copyright: initialAsset.metadata?.copyright || '',
        });
    }, [initialAsset]);

    // Update local asset state when prop changes
    useEffect(() => {
        setAsset(initialAsset);
    }, [initialAsset]);

    useEffect(() => {
        if (!isOpen) {
            setIsCropping(false);
            setCrop(undefined);
            setCompletedCrop(undefined);
        }
    }, [isOpen]);

    const getFileIcon = (asset: Asset) => {
        const extension = asset.extension.toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
            return <FileImage className="h-10 w-10 text-blue-500" />;
        }

        if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv'].includes(extension)) {
            return <FileVideo className="h-10 w-10 text-purple-500" />;
        }

        if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) {
            return <FileAudio className="h-10 w-10 text-green-500" />;
        }

        if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
            return <FileText className="h-10 w-10 text-yellow-500" />;
        }

        return <File className="h-10 w-10 text-muted-foreground" />;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const response = await axios.put(route('assets.api.update', [project.id, asset.id]), data);
            
            if (response.data) {
                const updatedAsset = response.data;
                setAsset(updatedAsset);
                
                // Notify parent component if callback provided
                if (onUpdate) {
                    onUpdate(updatedAsset);
                }
                
                toast.success('Asset updated successfully');
            }
        } catch (error) {
            console.error('Error updating asset:', error);
            toast.error('Failed to update asset');
        } finally {
            setSubmitting(false);
        }
    };

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const crop = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 90,
                },
                maintainAspectRatio ? 16 / 9 : 1,
                width,
                height
            ),
            width,
            height
        );
        setCrop(crop);
    };

    const handleCropComplete = async () => {
        if (!completedCrop || !imgRef.current) return;

        try {
            const image = imgRef.current;
            const canvas = document.createElement('canvas');

            // Get the actual displayed dimensions of the image
            const displayWidth = image.width;
            const displayHeight = image.height;

            // Get the natural (original) dimensions of the image
            const naturalWidth = image.naturalWidth;
            const naturalHeight = image.naturalHeight;

            // Calculate scaling factors
            const scaleX = naturalWidth / displayWidth;
            const scaleY = naturalHeight / displayHeight;

            // Calculate the actual crop dimensions in pixels
            const cropX = Math.round(completedCrop.x * scaleX);
            const cropY = Math.round(completedCrop.y * scaleY);
            const cropWidth = Math.round(completedCrop.width * scaleX);
            const cropHeight = Math.round(completedCrop.height * scaleY);

            // Set canvas dimensions to match the crop size
            canvas.width = cropWidth;
            canvas.height = cropHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Set high quality rendering
            ctx.imageSmoothingQuality = 'high';

            // Draw the cropped portion of the image
            ctx.drawImage(
                image,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                cropWidth,
                cropHeight
            );

            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                }, 'image/jpeg', 0.95);
            });

            // Create form data
            const formData = new FormData();
            formData.append('file', blob, asset.original_filename);
            formData.append('_method', 'PUT');

            // Update the existing asset
            const response = await axios.post(route('assets.crop', [project.id, asset.id]), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data) {
                const updatedAsset = response.data;
                setAsset(updatedAsset);
                
                // Notify parent component if callback provided
                if (onUpdate) {
                    onUpdate(updatedAsset);
                }

                toast.success('Image cropped successfully');
                setIsCropping(false);
            }
        } catch (error) {
            toast.error('Failed to crop image');
        }
    };

    const handleCopyUuid = async () => {

        try {
            await navigator.clipboard.writeText(asset.uuid);
            setCopiedUuid(true);
            toast.success('UUID copied to clipboard');
            setTimeout(() => setCopiedUuid(false), 2000);
        } catch (err) {
            toast.error('Failed to copy UUID');
        }
    };

    const handleCopyUrl = async () => {
        try {
            const urlToCopy = asset.full_url || asset.url;
            await navigator.clipboard.writeText(urlToCopy);
            setCopied(true);
            toast.success('URL copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy URL');
        }
    };

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(asset.extension.toLowerCase());

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className='sm:max-w-4xl overflow-y-auto'>
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 p-0">
                    <DialogTitle className="text-lg font-medium">{asset.original_filename}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {asset.metadata?.alt_text || asset.original_filename}
                    </DialogDescription>
                    <div className="flex items-center gap-2">
                        {isImage && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 h-8"
                                onClick={() => setIsCropping(!isCropping)}
                            >
                                <Crop className="h-3.5 w-3.5" />
                                {isCropping ? 'Cancel' : 'Crop'}
                            </Button>
                        )}
                        <a href={asset.url} download>
                            <Button variant="outline" size="sm" className="gap-1.5 h-8">
                                <Download className="h-3.5 w-3.5" />
                                Download
                            </Button>
                        </a>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Asset Preview */}
                    <div className={`${isCropping ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}>
                        <div className={`bg-muted rounded-md flex items-center justify-center overflow-hidden ${isCropping ? 'h-[calc(100vh-200px)]' : 'h-[250px]'}`}>
                            {isImage ? (
                                isCropping ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                                            <Button
                                                onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
                                                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 h-8"
                                            >
                                                {maintainAspectRatio ? (
                                                    <>
                                                        <Lock className="h-3.5 w-3.5" />
                                                        Free Crop
                                                    </>
                                                ) : (
                                                    <>
                                                        <Unlock className="h-3.5 w-3.5" />
                                                        Fixed Ratio
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={handleCropComplete}
                                                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 h-8"
                                            >
                                                <Crop className="h-3.5 w-3.5" />
                                                Apply
                                            </Button>
                                        </div>
                                        <ReactCrop
                                            crop={crop}
                                            onChange={(c) => setCrop(c)}
                                            onComplete={(c) => setCompletedCrop(c)}
                                            aspect={maintainAspectRatio ? 16 / 9 : undefined}
                                            className="max-h-[500px] max-w-[500px]"
                                            minWidth={50}
                                            minHeight={50}
                                        >
                                            <img
                                                ref={imgRef}
                                                src={asset.url}
                                                alt={asset.metadata?.alt_text || asset.original_filename}
                                                onLoad={onImageLoad}
                                                className="max-h-[500px]"
                                            />
                                        </ReactCrop>
                                    </div>
                                ) : (
                                    <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate">
                                        <img
                                            src={asset.url}
                                            alt={asset.metadata?.alt_text || asset.original_filename}
                                            className="max-w-full object-contain rounded-md"
                                        />
                                    </a>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center">
                                    {getFileIcon(asset)}
                                    <span className="mt-2 text-sm font-medium">{asset.extension.toUpperCase()} File</span>
                                </div>
                            )}
                        </div>

                        {/* Asset Information */}
                        {!isCropping && (
                            <div className="bg-muted/50 rounded-md p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-base font-medium">File Information</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Filename</Label>
                                        <p className="text-sm font-medium truncate">{asset.original_filename}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">File ID</Label>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <p className="text-sm font-medium truncate">{asset.uuid}</p>
                                        <div
                                                className="cursor-pointer hover:text-primary"
                                                onClick={handleCopyUuid}
                                            >
                                                {copiedUuid ? (
                                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">File URL</Label>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate">{asset.full_url || asset.url}</a>
                                            <div
                                                className="cursor-pointer hover:text-primary"
                                                onClick={handleCopyUrl}
                                            >
                                                {copied ? (
                                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">File Type</Label>
                                        <p className="text-sm font-medium">{asset.mime_type}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">File Size</Label>
                                        <p className="text-sm font-medium">{asset.formatted_size}</p>
                                    </div>
                                    {isImage && asset.metadata?.width && asset.metadata?.height && (
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Dimensions</Label>
                                            <p className="text-sm font-medium">{asset.metadata.width} × {asset.metadata.height} px</p>
                                        </div>
                                    )}

                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Uploaded</Label>
                                        <p className="text-sm font-medium">{formatDate(asset.created_at)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Modified</Label>
                                        <p className="text-sm font-medium">{formatDate(asset.updated_at)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Edit Form */}
                    {!isCropping && (
                        <div>
                            <div className="bg-muted/50 rounded-md p-3 pb-5">
                                <form onSubmit={handleSubmit} className="space-y-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="alt_text" className="text-xs">Alt Text</Label>
                                        <Input
                                            id="alt_text"
                                            value={data.alt_text}
                                            onChange={(e) => setData('alt_text', e.target.value)}
                                            placeholder="Enter alt text"
                                            className="h-8 text-sm"
                                        />
                                        <InputError message={errors.alt_text} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="title" className="text-xs">Title</Label>
                                        <Input
                                            id="title"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Enter title"
                                            className="h-8 text-sm"
                                        />
                                        <InputError message={errors.title} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="caption" className="text-xs">Caption</Label>
                                        <Textarea
                                            id="caption"
                                            value={data.caption}
                                            onChange={(e) => setData('caption', e.target.value)}
                                            placeholder="Enter caption"
                                            rows={2}
                                            className="text-sm"
                                        />
                                        <InputError message={errors.caption} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="description" className="text-xs">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Enter description"
                                            rows={3}
                                            className="text-sm"
                                        />
                                        <InputError message={errors.description} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="author" className="text-xs">Author</Label>
                                        <Input
                                            id="author"
                                            value={data.author}
                                            onChange={(e) => setData('author', e.target.value)}
                                            placeholder="Enter author name"
                                            className="h-8 text-sm"
                                        />
                                        <InputError message={errors.author} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="copyright" className="text-xs">Copyright</Label>
                                        <Input
                                            id="copyright"
                                            value={data.copyright}
                                            onChange={(e) => setData('copyright', e.target.value)}
                                            placeholder="Enter copyright information"
                                            className="h-8 text-sm"
                                        />
                                        <InputError message={errors.copyright} />
                                    </div>

                                    <Button type="submit" disabled={submitting} className="w-full mt-2">
                                        {submitting ? "Saving..." : "Save Changes"}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
} 