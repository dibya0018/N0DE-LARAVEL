export interface Project {
    id: number;
    uuid: string;
    name: string;
    description: string | null;
    disk: 'public' | 's3';
    default_locale: string;
    locales?: string[];
    settings: Record<string, any> | null;
    public_api: boolean;
    created_at: string;
    updated_at: string;
    collections?: Collection[];
    collections_count?: number;
    assets_count?: number;
    content_count?: number;
}

export interface Collection {
    id: number;
    uuid: string;
    project_id: number;
    name: string;
    slug: string;
    order: number | null;
    description?: string;
    is_singleton?: boolean;
    created_at: string;
    updated_at: string;
    fields?: Field[];
}

export interface Field {
    id: number;
    project_id: number;
    collection_id: number;
    name: string;
    label: string;
    type: 'text' | 'longtext' | 'richtext' | 'slug' | 'email' | 'password' |
          'number' | 'enumeration' | 'boolean' | 'color' | 'date' | 'time' |
          'media' | 'relation' | 'json' | 'group' | string;
    required: boolean;
    order?: number;
    parent_field_id?: number | null;
    children?: Field[];
    description?: string;
    placeholder?: string;
    validations?: Record<string, any>;
    options?: {
        repeatable?: boolean;
        hideInContentList?: boolean;
        hiddenInAPI?: boolean;
        includeTime?: boolean;
        mode?: 'single' | 'range';
        editor?: {
            type: number;
        };
        enumeration?: {
            list: string[];
        };
        multiple?: boolean;
        relation?: {
            collection: number | null;
            type: number;
        };
        slug?: {
            field: string | null;
            readonly: boolean;
        };
        media?: {
            type: number;
        };
        includeDraft?: boolean;
    };
    created_at: string;
    updated_at: string;
} 

export interface AssetMetadata {
    width?: number;
    height?: number;
    alt_text?: string;
    title?: string;
    caption?: string;
    description?: string;
    author?: string;
    copyright?: string;
  }
  
  export interface Asset {
    id: number;
    uuid: string;
    filename: string;
    original_filename: string;
    mime_type: string;
    extension: string;
    size: number;
    disk: string;
    path: string;
    url: string;
    full_url?: string;
    thumbnail_url: string | null;
    formatted_size: string;
    metadata: AssetMetadata | null;
    created_at: string;
    updated_at: string;
  }