/**
 * Determines whether clicking the ribbon icon should collapse the sidebar.
 *
 * @param hasLeaf       - whether the chat view leaf already exists
 * @param sidebarCollapsed - whether the right sidebar is currently collapsed
 * @param forceOpen     - when true (auto-start / command), always reveal, never collapse
 * @returns true → collapse sidebar; false → reveal / open new
 */
export function shouldCollapseView(
	hasLeaf: boolean,
	sidebarCollapsed: boolean,
	forceOpen = false,
): boolean {
	if (forceOpen) return false;
	return hasLeaf && !sidebarCollapsed;
}
