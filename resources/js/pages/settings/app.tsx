import { Head, useForm, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types/index.d';
import AppLayout from '@/layouts/app-layout';
import AppSettingsLayout from '@/layouts/settings/app-settings-layout';
import HeadingSmall from '@/components/heading-small';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import InputError from '@/components/input-error';
import { toast } from 'sonner';
import { FormEventHandler, ChangeEvent, useRef, useState, DragEvent } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
	{ title: 'App settings', href: '/settings/app' },
];

type AppSettingsForm = {
	app_name: string | null;
	logo: File | null;
	favicon: File | null;
	remove_logo: boolean;
	remove_favicon: boolean;
};

interface AppSettingsProps {
	settings: {
		app_name: string | null;
		logo_file: string | null;
		favicon_file: string | null;
	};
}

export default function AppSettings({ settings }: AppSettingsProps) {
	const { data, setData, post, processing, errors, progress } = useForm<AppSettingsForm>({
		app_name: settings.app_name || '',
		logo: null,
		favicon: null,
		remove_logo: false,
		remove_favicon: false,
	});

	const [isDragOver, setIsDragOver] = useState<string | null>(null);
	const logoRef = useRef<HTMLInputElement>(null);
	const faviconRef = useRef<HTMLInputElement>(null);

	const submit: FormEventHandler = (e) => {
		e.preventDefault();
		
		// Create FormData for file uploads
		const formData = new FormData();
		formData.append('app_name', data.app_name || '');
		if (data.logo) formData.append('logo', data.logo);
		if (data.favicon) formData.append('favicon', data.favicon);
		if (data.remove_logo) formData.append('remove_logo', '1');
		if (data.remove_favicon) formData.append('remove_favicon', '1');
		
		post(route('settings.app.update'), {
			preserveScroll: true,
			forceFormData: true,
			onSuccess: () => {
				toast.success('Settings saved successfully!');
				// Reset form data to clear file uploads and show current files
				setData({
					app_name: settings.app_name || '',
					logo: null,
					favicon: null,
					remove_logo: false,
					remove_favicon: false,
				});
				// Clear file input values
				if (logoRef.current) logoRef.current.value = '';
				if (faviconRef.current) faviconRef.current.value = '';
				// Reload to get updated settings
				router.reload();
			}
		});
	};

	const handleFileChange = (file: File | null, type: 'logo' | 'favicon') => {
		if (file) {
			// Validate file type
			const validTypes = type === 'logo' 
				? ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml']
				: ['image/x-icon', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml'];
			
			if (!validTypes.includes(file.type)) {
				alert(`Please select a valid ${type} file (PNG, JPG, GIF, SVG${type === 'favicon' ? ', ICO' : ''})`);
				return;
			}

			// Validate file size
			const maxSize = type === 'logo' ? 2 * 1024 * 1024 : 1024 * 1024; // 2MB for logo, 1MB for favicon
			if (file.size > maxSize) {
				alert(`File size must be less than ${type === 'logo' ? '2MB' : '1MB'}`);
				return;
			}
		}

		setData(type, file);
		setData(type === 'logo' ? 'remove_logo' : 'remove_favicon', false);
	};

	const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		handleFileChange(file, 'logo');
	};

	const handleFaviconChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		handleFileChange(file, 'favicon');
	};

	const handleDragOver = (e: DragEvent, type: 'logo' | 'favicon') => {
		e.preventDefault();
		setIsDragOver(type);
	};

	const handleDragLeave = (e: DragEvent) => {
		e.preventDefault();
		setIsDragOver(null);
	};

	const handleDrop = (e: DragEvent, type: 'logo' | 'favicon') => {
		e.preventDefault();
		setIsDragOver(null);
		
		const file = e.dataTransfer.files[0];
		if (file) {
			handleFileChange(file, type);
		}
	};

	const removeLogo = () => {
		setData('logo', null);
		setData('remove_logo', true);
		if (logoRef.current) logoRef.current.value = '';
	};

	const removeFavicon = () => {
		setData('favicon', null);
		setData('remove_favicon', true);
		if (faviconRef.current) faviconRef.current.value = '';
	};

	const FileUploadArea = ({ 
		type, 
		label, 
		description, 
		accept, 
		maxSize, 
		currentFile, 
		newFile, 
		onRemove, 
		onChange, 
		error 
	}: {
		type: 'logo' | 'favicon';
		label: string;
		description: string;
		accept: string;
		maxSize: string;
		currentFile: string | null;
		newFile: File | null;
		onRemove: () => void;
		onChange: (e: ChangeEvent<HTMLInputElement>) => void;
		error?: string;
	}) => {
		const ref = type === 'logo' ? logoRef : faviconRef;
		const hasCurrentFile = currentFile && !newFile && !(type === 'logo' ? data.remove_logo : data.remove_favicon);
		const isDragActive = isDragOver === type;
		const previewSize = type === 'logo' ? 'h-20 w-20' : 'h-12 w-12';

		return (
			<div className="space-y-4">
				<div>
					<Label className="text-base font-medium">{label}</Label>
					<p className="text-sm text-muted-foreground mt-1">{description}</p>
				</div>

				{/* Current file preview */}
				{hasCurrentFile && (
					<div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
						<img 
							src={currentFile} 
							alt={`Current ${label.toLowerCase()}`} 
							className={`${previewSize} object-contain border rounded-lg bg-white`}
						/>
						<div className="flex-1">
							<p className="text-sm font-medium">Current {label.toLowerCase()}</p>
							<p className="text-xs text-muted-foreground">Click remove to delete</p>
						</div>
						<Button 
							type="button" 
							variant="outline" 
							size="sm"
							onClick={onRemove}
						>
							<X className="h-4 w-4 mr-2" />
							Remove
						</Button>
					</div>
				)}
				
				{/* New file preview */}
				{newFile && (
					<div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
						<img 
							src={URL.createObjectURL(newFile)} 
							alt={`New ${label.toLowerCase()} preview`} 
							className={`${previewSize} object-contain border rounded-lg bg-white`}
						/>
						<div className="flex-1">
							<p className="text-sm font-medium text-green-800">New {label.toLowerCase()} ready</p>
							<p className="text-xs text-green-600">{newFile.name}</p>
						</div>
						<Button 
							type="button" 
							variant="outline" 
							size="sm"
							onClick={() => {
								setData(type, null);
								if (ref.current) ref.current.value = '';
							}}
						>
							<X className="h-4 w-4 mr-2" />
							Cancel
						</Button>
					</div>
				)}
				
				{/* Upload area */}
				<div
					className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
						isDragActive 
							? 'border-primary bg-primary/5' 
							: 'border-muted-foreground/25 hover:border-primary/50'
					}`}
					onDragOver={(e) => handleDragOver(e, type)}
					onDragLeave={handleDragLeave}
					onDrop={(e) => handleDrop(e, type)}
					onClick={() => ref.current?.click()}
				>
					<input
						ref={ref}
						type="file"
						accept={accept}
						onChange={onChange}
						className="hidden"
					/>
					<div className="space-y-2">
						<ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
						<div>
							<p className="text-sm font-medium">
								{isDragActive ? 'Drop your file here' : 'Click to upload or drag and drop'}
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								{accept} up to {maxSize}
							</p>
						</div>
					</div>
				</div>
				
				{error && <InputError message={error} />}
			</div>
		);
	};

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="App settings" />
			<AppSettingsLayout>
				<div className="space-y-6">
					<form onSubmit={submit} className="space-y-8">
						{/* App Name */}
						<div className="space-y-4">
							<div>
								<Label className="text-base font-medium">App Name</Label>
								<p className="text-sm text-muted-foreground mt-1">Set the name that appears in your application</p>
							</div>
							<div className="space-y-2">
								<Input 
									id="app_name" 
									value={data.app_name || ''} 
									onChange={(e) => setData('app_name', e.target.value)} 
									placeholder="Enter your app name" 
									className="max-w-md"
								/>
								<InputError message={errors.app_name} />
							</div>
						</div>

						{/* Logo Upload */}
						<FileUploadArea
							type="logo"
							label="Logo"
							description="Upload your application logo. Recommended size: 200x60px"
							accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
							maxSize="2MB"
							currentFile={settings.logo_file}
							newFile={data.logo}
							onRemove={removeLogo}
							onChange={handleLogoChange}
							error={errors.logo}
						/>

						{/* Favicon Upload */}
						<FileUploadArea
							type="favicon"
							label="Favicon"
							description="Upload your favicon. Recommended size: 32x32px or 16x16px"
							accept="image/x-icon,image/png,image/jpg,image/gif,image/svg+xml"
							maxSize="1MB"
							currentFile={settings.favicon_file}
							newFile={data.favicon}
							onRemove={removeFavicon}
							onChange={handleFaviconChange}
							error={errors.favicon}
						/>


						{/* Submit button */}
						<div className="flex">
							<Button type="submit" disabled={processing} className="min-w-24">
								{processing ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
										Saving...
									</>
								) : (
									'Save Changes'
								)}
							</Button>
						</div>
					</form>
				</div>
			</AppSettingsLayout>
		</AppLayout>
	);
}