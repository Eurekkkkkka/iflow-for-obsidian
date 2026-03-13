export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export interface ImageAttachment {
	id: string;
	name: string;
	mediaType: ImageMediaType;
	data: string;
	size: number;
	source: 'paste' | 'drop';
}

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, ImageMediaType> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
};

export function getImageMediaType(filename: string): ImageMediaType | null {
	const dotIndex = filename.lastIndexOf('.');
	if (dotIndex < 0) {
		return null;
	}
	const ext = filename.toLowerCase().substring(dotIndex);
	return IMAGE_EXTENSIONS[ext] ?? null;
}

export function isSupportedImageFile(file: { name: string; type: string }): boolean {
	return file.type.startsWith('image/') && getImageMediaType(file.name) !== null;
}

export function generateImageAttachmentId(
	now: number = Date.now(),
	randomValue: number = Math.random(),
): string {
	const randomPart = Math.floor(randomValue * 36).toString(36);
	return `img-${now}-${randomPart}`;
}

export function truncateImageName(name: string, maxLen: number): string {
	if (name.length <= maxLen) {
		return name;
	}
	const dotIndex = name.lastIndexOf('.');
	const ext = dotIndex >= 0 ? name.substring(dotIndex) : '';
	const base = dotIndex >= 0 ? name.substring(0, dotIndex) : name;
	const availableLength = Math.max(1, maxLen - ext.length - 3);
	return `${base.substring(0, availableLength)}...${ext}`;
}

export function formatImageSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
