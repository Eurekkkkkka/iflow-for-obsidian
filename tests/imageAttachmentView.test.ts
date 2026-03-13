import { describe, expect, it } from 'vitest';
import {
	formatImageSize,
	generateImageAttachmentId,
	getImageMediaType,
	isSupportedImageFile,
	truncateImageName,
} from '../src/ui/chat/imageAttachmentView';

describe('imageAttachmentView helpers', () => {
	it('detects media type from extension', () => {
		expect(getImageMediaType('a.png')).toBe('image/png');
		expect(getImageMediaType('a.txt')).toBeNull();
	});

	it('checks supported image file', () => {
		expect(isSupportedImageFile({ name: 'x.jpg', type: 'image/jpeg' })).toBe(true);
		expect(isSupportedImageFile({ name: 'x.jpg', type: 'text/plain' })).toBe(false);
	});

	it('formats size and truncates name', () => {
		expect(formatImageSize(512)).toBe('512 B');
		expect(formatImageSize(2048)).toContain('KB');
		expect(truncateImageName('very-long-name.png', 10)).toContain('...');
	});

	it('generates stable id with injected timestamp and random', () => {
		expect(generateImageAttachmentId(100, 0.5)).toBe('img-100-i');
	});
});
