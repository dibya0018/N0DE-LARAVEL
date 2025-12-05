import { ImgHTMLAttributes } from 'react';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types/index.d';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    const { branding } = usePage<SharedData>().props;
    const src = branding.logo_url || '/logo.svg';
    return <img src={src} {...props} />;
}