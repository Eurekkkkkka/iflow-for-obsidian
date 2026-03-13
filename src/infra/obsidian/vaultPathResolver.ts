export function toVaultRelativePath(filePath: string, vaultPath: string): string {
	if (filePath.startsWith(vaultPath + '/')) {
		return filePath.substring(vaultPath.length + 1);
	}

	let normalizedPath = filePath;

	if (normalizedPath.startsWith('/')) {
		normalizedPath = normalizedPath.substring(1);
	}

	if (normalizedPath.startsWith(vaultPath)) {
		normalizedPath = normalizedPath.substring(vaultPath.length);
		if (normalizedPath.startsWith('/')) {
			normalizedPath = normalizedPath.substring(1);
		}
	}

	return normalizedPath;
}
