import { isCanvasFile, normalizeCanvasContent } from './canvasFileAdapter';
import { toVaultRelativePath } from './vaultPathResolver';

export interface VaultAdapterLike {
	read(path: string): Promise<string>;
	write(path: string, content: string): Promise<void>;
}

export class VaultFileBridge {
	constructor(private readonly adapter: VaultAdapterLike, private readonly vaultPath: string) {}

	async readTextFile(path: string): Promise<{ content?: string; error?: string }> {
		try {
			const relativePath = toVaultRelativePath(path, this.vaultPath);
			const content = await this.adapter.read(relativePath);
			return { content };
		} catch (error) {
			return { error: error instanceof Error ? error.message : String(error) };
		}
	}

	async writeTextFile(path: string, content: string): Promise<{ error?: string } | null> {
		try {
			const relativePath = toVaultRelativePath(path, this.vaultPath);
			const normalized = isCanvasFile(relativePath) ? normalizeCanvasContent(content) : content;
			await this.adapter.write(relativePath, normalized);
			return null;
		} catch (error) {
			return { error: error instanceof Error ? error.message : String(error) };
		}
	}
}
