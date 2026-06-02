import type { ColumnConfig, GridId } from '$lib/types';

// Container grid columns
export const containerColumns: ColumnConfig[] = [
	{ id: 'select', label: '', fixed: 'start', width: 32, resizable: false },
	{ id: 'name', label: 'Name', labelKey: 'common.labels.name', sortable: true, sortField: 'name', width: 140, minWidth: 80, grow: true },
	{ id: 'image', label: 'Image', labelKey: 'common.labels.image', sortable: true, sortField: 'image', width: 180, minWidth: 100, grow: true },
	{ id: 'state', label: 'State', labelKey: 'common.labels.state', sortable: true, sortField: 'state', width: 90, minWidth: 70, noTruncate: true },
	{ id: 'health', label: 'Health', labelKey: 'common.labels.health', sortable: true, sortField: 'health', width: 55, minWidth: 40 },
	{ id: 'uptime', label: 'Uptime', labelKey: 'common.labels.uptime', sortable: true, sortField: 'uptime', width: 80, minWidth: 60 },
	{ id: 'restartCount', label: 'Restarts', labelKey: 'common.labels.restarts', width: 70, minWidth: 50 },
	{ id: 'cpu', label: 'CPU', labelKey: 'common.labels.cpu', sortable: true, sortField: 'cpu', width: 50, minWidth: 40, align: 'right' },
	{ id: 'memory', label: 'Memory', labelKey: 'common.labels.memory', sortable: true, sortField: 'memory', width: 95, minWidth: 70, align: 'right' },
	{ id: 'networkIO', label: 'Net I/O', labelKey: 'common.labels.netIo', width: 85, minWidth: 70, align: 'right' },
	{ id: 'diskIO', label: 'Disk I/O', labelKey: 'common.labels.diskIo', width: 85, minWidth: 70, align: 'right' },
	{ id: 'ip', label: 'IP', labelKey: 'common.labels.ip', sortable: true, sortField: 'ip', width: 100, minWidth: 80 },
	{ id: 'ports', label: 'Ports', labelKey: 'common.labels.ports', sortable: true, sortField: 'ports', width: 120, minWidth: 60 },
	{ id: 'autoUpdate', label: 'Auto-update', labelKey: 'common.labels.autoUpdate', width: 95, minWidth: 70 },
	{ id: 'stack', label: 'Stack', labelKey: 'common.labels.stack', sortable: true, sortField: 'stack', width: 100, minWidth: 60 },
	{ id: 'actions', label: '', fixed: 'end', width: 200, minWidth: 150, resizable: true }
];

// Image grid columns
export const imageColumns: ColumnConfig[] = [
	{ id: 'select', label: '', fixed: 'start', width: 32, resizable: false },
	{ id: 'expand', label: '', fixed: 'start', width: 24, resizable: false },
	{ id: 'image', label: 'Image', labelKey: 'common.labels.image', sortable: true, sortField: 'name', width: 220, minWidth: 120, grow: true },
	{ id: 'tags', label: 'Tags', labelKey: 'common.labels.tags', sortable: true, sortField: 'tags', width: 80, minWidth: 50 },
	{ id: 'size', label: 'Size', labelKey: 'common.labels.size', sortable: true, sortField: 'size', width: 80, minWidth: 60 },
	{ id: 'updated', label: 'Updated', labelKey: 'common.labels.updated', sortable: true, sortField: 'created', width: 140, minWidth: 100 },
	{ id: 'actions', label: '', fixed: 'end', width: 120, resizable: false }
];

// Image tags grid columns (nested inside expanded image row)
export const imageTagColumns: ColumnConfig[] = [
	{ id: 'tag', label: 'Tag', labelKey: 'common.labels.tag', width: 180, minWidth: 60 },
	{ id: 'id', label: 'ID', labelKey: 'common.labels.id', width: 120, minWidth: 80 },
	{ id: 'size', label: 'Size', labelKey: 'common.labels.size', width: 80, minWidth: 60 },
	{ id: 'created', label: 'Created', labelKey: 'common.labels.created', width: 140, minWidth: 100 },
	{ id: 'used', label: 'Used by', labelKey: 'common.labels.usedBy', width: 100, minWidth: 70 },
	{ id: 'actions', label: '', fixed: 'end', width: 200, resizable: false }
];

// Network grid columns
export const networkColumns: ColumnConfig[] = [
	{ id: 'select', label: '', fixed: 'start', width: 32, resizable: false },
	{ id: 'name', label: 'Name', labelKey: 'common.labels.name', sortable: true, sortField: 'name', width: 260, minWidth: 120, grow: true },
	{ id: 'driver', label: 'Driver', labelKey: 'common.labels.driver', sortable: true, sortField: 'driver', width: 100, resizable: false },
	{ id: 'scope', label: 'Scope', labelKey: 'common.labels.scope', width: 80, minWidth: 50 },
	{ id: 'subnet', label: 'Subnet', labelKey: 'common.labels.subnet', sortable: true, sortField: 'subnet', width: 160, minWidth: 100 },
	{ id: 'gateway', label: 'Gateway', labelKey: 'common.labels.gateway', sortable: true, sortField: 'gateway', width: 140, minWidth: 100 },
	{ id: 'containers', label: 'Containers', labelKey: 'common.labels.containers', sortable: true, sortField: 'containers', width: 100, minWidth: 70 },
	{ id: 'actions', label: '', fixed: 'end', width: 160, resizable: false }
];

// Stack grid columns
export const stackColumns: ColumnConfig[] = [
	{ id: 'select', label: '', fixed: 'start', width: 32, resizable: false },
	{ id: 'expand', label: '', fixed: 'start', width: 24, resizable: false },
	{ id: 'name', label: 'Name', labelKey: 'common.labels.name', sortable: true, sortField: 'name', width: 180, minWidth: 100, grow: true },
	{ id: 'status', label: 'Status', labelKey: 'common.labels.status', sortable: true, sortField: 'status', width: 120, minWidth: 90 },
	{ id: 'source', label: 'Source', labelKey: 'common.labels.source', width: 100, minWidth: 100, noTruncate: true },
	{ id: 'location', label: 'Location', labelKey: 'common.labels.location', width: 180, minWidth: 100 },
	{ id: 'containers', label: 'Containers', labelKey: 'common.labels.containers', sortable: true, sortField: 'containers', width: 100, minWidth: 70 },
	{ id: 'cpu', label: 'CPU', labelKey: 'common.labels.cpu', sortable: true, sortField: 'cpu', width: 60, minWidth: 50, align: 'right' },
	{ id: 'memory', label: 'Memory', labelKey: 'common.labels.memory', sortable: true, sortField: 'memory', width: 70, minWidth: 50, align: 'right' },
	{ id: 'networkIO', label: 'Net I/O', labelKey: 'common.labels.netIo', width: 100, minWidth: 70, align: 'right' },
	{ id: 'diskIO', label: 'Disk I/O', labelKey: 'common.labels.diskIo', width: 100, minWidth: 70, align: 'right' },
	{ id: 'networks', label: 'Networks', labelKey: 'common.labels.networks', width: 80, minWidth: 60 },
	{ id: 'volumes', label: 'Volumes', labelKey: 'common.labels.volumes', width: 80, minWidth: 60 },
	{ id: 'actions', label: '', fixed: 'end', width: 180, resizable: false }
];

// Volume grid columns
export const volumeColumns: ColumnConfig[] = [
	{ id: 'select', label: '', fixed: 'start', width: 32, resizable: false },
	{ id: 'name', label: 'Name', labelKey: 'common.labels.name', sortable: true, sortField: 'name', width: 400, minWidth: 150, grow: true },
	{ id: 'driver', label: 'Driver', labelKey: 'common.labels.driver', sortable: true, sortField: 'driver', width: 80, minWidth: 60 },
	{ id: 'scope', label: 'Scope', labelKey: 'common.labels.scope', width: 70, minWidth: 50 },
	{ id: 'stack', label: 'Stack', labelKey: 'common.labels.stack', sortable: true, sortField: 'stack', width: 120, minWidth: 80 },
	{ id: 'usedBy', label: 'Used by', labelKey: 'common.labels.usedBy', width: 150, minWidth: 80 },
	{ id: 'created', label: 'Created', labelKey: 'common.labels.created', sortable: true, sortField: 'created', width: 160, minWidth: 120 },
	{ id: 'actions', label: '', fixed: 'end', width: 160, resizable: false }
];

// Activity grid columns (no selection, no column reordering - simpler grid)
export const activityColumns: ColumnConfig[] = [
	{ id: 'timestamp', label: 'Timestamp', labelKey: 'common.labels.timestamp', width: 160, minWidth: 140 },
	{ id: 'environment', label: 'Environment', labelKey: 'common.labels.environment', width: 180, minWidth: 100 },
	{ id: 'action', label: 'Action', labelKey: 'common.labels.actions', width: 60, resizable: false },
	{ id: 'container', label: 'Container', labelKey: 'common.labels.container', width: 240, minWidth: 120, grow: true },
	{ id: 'image', label: 'Image', labelKey: 'common.labels.image', width: 260, minWidth: 120 },
	{ id: 'exitCode', label: 'Exit', labelKey: 'common.labels.exit', width: 50, minWidth: 40 },
	{ id: 'actions', label: '', fixed: 'end', width: 50, resizable: false }
];

// Audit log grid columns
export const auditColumns: ColumnConfig[] = [
	{ id: 'timestamp', label: 'Timestamp', labelKey: 'common.labels.timestamp', width: 165, minWidth: 140 },
	{ id: 'environment', label: 'Environment', labelKey: 'common.labels.environment', width: 140, minWidth: 100 },
	{ id: 'user', label: 'User', labelKey: 'common.labels.user', width: 120, minWidth: 80 },
	{ id: 'action', label: 'Action', labelKey: 'common.labels.actions', width: 55, resizable: false },
	{ id: 'entity', label: 'Entity', labelKey: 'common.labels.entity', width: 100, minWidth: 80 },
	{ id: 'name', label: 'Name', labelKey: 'common.labels.name', width: 200, minWidth: 100, grow: true },
	{ id: 'ip', label: 'IP address', labelKey: 'common.labels.ipAddress', width: 120, minWidth: 90 },
	{ id: 'actions', label: '', fixed: 'end', width: 50, resizable: false }
];

// Schedule grid columns
export const scheduleColumns: ColumnConfig[] = [
	{ id: 'expand', label: '', fixed: 'start', width: 24, resizable: false },
	{ id: 'schedule', label: 'Schedule', labelKey: 'common.labels.schedule', width: 450, minWidth: 300, grow: true },
	{ id: 'environment', label: 'Environment', labelKey: 'common.labels.environment', width: 140, minWidth: 100 },
	{ id: 'cron', label: 'Schedule', labelKey: 'common.labels.schedule', width: 180, minWidth: 120 },
	{ id: 'lastRun', label: 'Last run', labelKey: 'common.labels.lastRun', width: 160, minWidth: 120 },
	{ id: 'nextRun', label: 'Next run', labelKey: 'common.labels.nextRun', width: 160, minWidth: 100 },
	{ id: 'status', label: 'Status', labelKey: 'common.labels.status', width: 70, resizable: false },
	{ id: 'actions', label: '', fixed: 'end', width: 100, resizable: false }
];

// Environment grid columns (dashboard list view)
export const environmentColumns: ColumnConfig[] = [
	{ id: 'status', label: '', width: 36, resizable: false },
	{ id: 'name', label: 'Environment', labelKey: 'common.labels.environment', sortable: true, sortField: 'name', width: 180, minWidth: 100, grow: true },
	{ id: 'connection', label: 'Connection', labelKey: 'common.labels.connection', sortable: true, sortField: 'connection', width: 110, minWidth: 80 },
	{ id: 'host', label: 'Host', labelKey: 'common.labels.host', sortable: true, sortField: 'host', width: 150, minWidth: 80 },
	{ id: 'containers', label: 'Containers', labelKey: 'common.labels.containers', sortable: true, sortField: 'containers', width: 100, minWidth: 70 },
	{ id: 'updates', label: 'Updates', labelKey: 'common.labels.updates', sortable: true, sortField: 'updates', width: 75, minWidth: 55 },
	{ id: 'cpu', label: 'CPU', labelKey: 'common.labels.cpu', sortable: true, sortField: 'cpu', width: 110, minWidth: 80 },
	{ id: 'memory', label: 'Memory', labelKey: 'common.labels.memory', sortable: true, sortField: 'memory', width: 110, minWidth: 80 },
	{ id: 'images', label: 'Images', labelKey: 'common.labels.images', sortable: true, sortField: 'images', width: 65, minWidth: 50 },
	{ id: 'volumes', label: 'Volumes', labelKey: 'common.labels.volumes', sortable: true, sortField: 'volumes', width: 70, minWidth: 50 },
	{ id: 'stacks', label: 'Stacks', labelKey: 'common.labels.stacks', sortable: true, sortField: 'stacks', width: 85, minWidth: 65 },
	{ id: 'events', label: 'Events', labelKey: 'common.labels.events', sortable: true, sortField: 'events', width: 65, minWidth: 50 },
	{ id: 'labels', label: 'Labels', labelKey: 'common.labels.labels', width: 150, minWidth: 80 }
];

// Map of grid ID to column definitions
export const gridColumnConfigs: Record<GridId, ColumnConfig[]> = {
	containers: containerColumns,
	images: imageColumns,
	imageTags: imageTagColumns,
	networks: networkColumns,
	stacks: stackColumns,
	volumes: volumeColumns,
	activity: activityColumns,
	schedules: scheduleColumns,
	audit: auditColumns,
	environments: environmentColumns
};

// Get configurable columns (not fixed)
export function getConfigurableColumns(gridId: GridId): ColumnConfig[] {
	return gridColumnConfigs[gridId].filter((col) => !col.fixed);
}

// Get fixed columns at start
export function getFixedStartColumns(gridId: GridId): ColumnConfig[] {
	return gridColumnConfigs[gridId].filter((col) => col.fixed === 'start');
}

// Get fixed columns at end
export function getFixedEndColumns(gridId: GridId): ColumnConfig[] {
	return gridColumnConfigs[gridId].filter((col) => col.fixed === 'end');
}

// Get default column visibility preferences for a grid
export function getDefaultColumnPreferences(gridId: GridId): { id: string; visible: boolean }[] {
	return getConfigurableColumns(gridId).map((col) => ({
		id: col.id,
		visible: true
	}));
}

// Get all column configs (fixed + configurable in order)
export function getAllColumnConfigs(gridId: GridId): ColumnConfig[] {
	return gridColumnConfigs[gridId];
}
