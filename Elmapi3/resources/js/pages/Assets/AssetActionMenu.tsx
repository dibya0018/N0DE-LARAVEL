import { Edit, MoreVertical, Eye, Download, Trash } from "lucide-react";

import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent } from "@/components/ui/dropdown-menu";

import { Asset } from "@/types";

interface ActionMenuProps {
	asset: Asset;
	onViewDetails: (asset: Asset) => void;
	onDelete: (asset: Asset) => void;
	canUpdate?: boolean;
	canDelete?: boolean;
}

export default function ActionMenu({ asset, onViewDetails, onDelete, canUpdate = false, canDelete = false }: ActionMenuProps) {
	return (
		<div>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="icon" className="h-8 w-8">
						<MoreVertical className="h-4 w-4" />
						<span className="sr-only">Actions</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{canUpdate && (
						<DropdownMenuItem onClick={() => onViewDetails(asset)}>
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</DropdownMenuItem>
					)}
					<DropdownMenuItem asChild>
						<a href={asset.url} target="_blank" rel="noopener noreferrer">
							<Eye className="h-4 w-4 mr-2" />
							View
						</a>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<a href={asset.url} download>
							<Download className="h-4 w-4 mr-2" />
							Download
						</a>
					</DropdownMenuItem>
					{canDelete && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive"
								onClick={() => onDelete(asset)}
							>
								<Trash className="h-4 w-4 mr-2" />
								Delete
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}