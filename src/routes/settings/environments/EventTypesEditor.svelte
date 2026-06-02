<script lang="ts">
	import { TogglePill } from '$lib/components/ui/toggle-pill';
	import {
		Box,
		RefreshCw,
		GitBranch,
		Layers,
		Shield,
		HardDrive,
		ChevronDown,
		ChevronRight
	} from 'lucide-svelte';
	import { t } from '$lib/i18n';

	interface EventType {
		id: string;
		labelKey: string;
		descriptionKey: string;
	}

	interface EventGroup {
		id: string;
		labelKey: string;
		icon: typeof Box;
		events: EventType[];
	}

	interface Props {
		selectedEventTypes: string[];
		onchange: (eventTypes: string[]) => void;
		disabled?: boolean;
	}

	let { selectedEventTypes, onchange, disabled = false }: Props = $props();

	// Track collapsed state for groups
	let collapsedGroups = $state<Set<string>>(new Set());

	function toggleGroup(groupId: string) {
		if (collapsedGroups.has(groupId)) {
			collapsedGroups = new Set([...collapsedGroups].filter(id => id !== groupId));
		} else {
			collapsedGroups = new Set([...collapsedGroups, groupId]);
		}
	}

	// Notification event types - grouped by category with icons
	const NOTIFICATION_EVENT_GROUPS: EventGroup[] = [
		{
			id: 'container',
			labelKey: 'settings.environments.events.groups.container',
			icon: Box,
			events: [
				{ id: 'container_started', labelKey: 'settings.environments.events.types.containerStarted.label', descriptionKey: 'settings.environments.events.types.containerStarted.description' },
				{ id: 'container_stopped', labelKey: 'settings.environments.events.types.containerStopped.label', descriptionKey: 'settings.environments.events.types.containerStopped.description' },
				{ id: 'container_restarted', labelKey: 'settings.environments.events.types.containerRestarted.label', descriptionKey: 'settings.environments.events.types.containerRestarted.description' },
				{ id: 'container_exited', labelKey: 'settings.environments.events.types.containerExited.label', descriptionKey: 'settings.environments.events.types.containerExited.description' },
				{ id: 'container_unhealthy', labelKey: 'settings.environments.events.types.containerUnhealthy.label', descriptionKey: 'settings.environments.events.types.containerUnhealthy.description' },
				{ id: 'container_healthy', labelKey: 'settings.environments.events.types.containerHealthy.label', descriptionKey: 'settings.environments.events.types.containerHealthy.description' },
				{ id: 'container_oom', labelKey: 'settings.environments.events.types.containerOom.label', descriptionKey: 'settings.environments.events.types.containerOom.description' },
				{ id: 'container_updated', labelKey: 'settings.environments.events.types.containerUpdated.label', descriptionKey: 'settings.environments.events.types.containerUpdated.description' }
			]
		},
		{
			id: 'auto_update',
			labelKey: 'settings.environments.events.groups.autoUpdate',
			icon: RefreshCw,
			events: [
				{ id: 'auto_update_success', labelKey: 'settings.environments.events.types.autoUpdateSuccess.label', descriptionKey: 'settings.environments.events.types.autoUpdateSuccess.description' },
				{ id: 'auto_update_failed', labelKey: 'settings.environments.events.types.autoUpdateFailed.label', descriptionKey: 'settings.environments.events.types.autoUpdateFailed.description' },
				{ id: 'auto_update_blocked', labelKey: 'settings.environments.events.types.autoUpdateBlocked.label', descriptionKey: 'settings.environments.events.types.autoUpdateBlocked.description' },
				{ id: 'updates_detected', labelKey: 'settings.environments.events.types.updatesDetected.label', descriptionKey: 'settings.environments.events.types.updatesDetected.description' },
				{ id: 'batch_update_success', labelKey: 'settings.environments.events.types.batchUpdateSuccess.label', descriptionKey: 'settings.environments.events.types.batchUpdateSuccess.description' }
			]
		},
		{
			id: 'git_stack',
			labelKey: 'settings.environments.events.groups.gitStack',
			icon: GitBranch,
			events: [
				{ id: 'git_sync_success', labelKey: 'settings.environments.events.types.gitSyncSuccess.label', descriptionKey: 'settings.environments.events.types.gitSyncSuccess.description' },
				{ id: 'git_sync_failed', labelKey: 'settings.environments.events.types.gitSyncFailed.label', descriptionKey: 'settings.environments.events.types.gitSyncFailed.description' },
				{ id: 'git_sync_skipped', labelKey: 'settings.environments.events.types.gitSyncSkipped.label', descriptionKey: 'settings.environments.events.types.gitSyncSkipped.description' }
			]
		},
		{
			id: 'stack',
			labelKey: 'settings.environments.events.groups.stack',
			icon: Layers,
			events: [
				{ id: 'stack_started', labelKey: 'settings.environments.events.types.stackStarted.label', descriptionKey: 'settings.environments.events.types.stackStarted.description' },
				{ id: 'stack_stopped', labelKey: 'settings.environments.events.types.stackStopped.label', descriptionKey: 'settings.environments.events.types.stackStopped.description' },
				{ id: 'stack_deployed', labelKey: 'settings.environments.events.types.stackDeployed.label', descriptionKey: 'settings.environments.events.types.stackDeployed.description' },
				{ id: 'stack_deploy_failed', labelKey: 'settings.environments.events.types.stackDeployFailed.label', descriptionKey: 'settings.environments.events.types.stackDeployFailed.description' }
			]
		},
		{
			id: 'security',
			labelKey: 'settings.environments.events.groups.security',
			icon: Shield,
			events: [
				{ id: 'vulnerability_critical', labelKey: 'settings.environments.events.types.vulnerabilityCritical.label', descriptionKey: 'settings.environments.events.types.vulnerabilityCritical.description' },
				{ id: 'vulnerability_high', labelKey: 'settings.environments.events.types.vulnerabilityHigh.label', descriptionKey: 'settings.environments.events.types.vulnerabilityHigh.description' },
				{ id: 'vulnerability_any', labelKey: 'settings.environments.events.types.vulnerabilityAny.label', descriptionKey: 'settings.environments.events.types.vulnerabilityAny.description' }
			]
		},
		{
			id: 'system',
			labelKey: 'settings.environments.events.groups.system',
			icon: HardDrive,
			events: [
				{ id: 'image_pulled', labelKey: 'settings.environments.events.types.imagePulled.label', descriptionKey: 'settings.environments.events.types.imagePulled.description' },
				{ id: 'image_prune_success', labelKey: 'settings.environments.events.types.imagePruneSuccess.label', descriptionKey: 'settings.environments.events.types.imagePruneSuccess.description' },
				{ id: 'image_prune_failed', labelKey: 'settings.environments.events.types.imagePruneFailed.label', descriptionKey: 'settings.environments.events.types.imagePruneFailed.description' },
				{ id: 'environment_offline', labelKey: 'settings.environments.events.types.environmentOffline.label', descriptionKey: 'settings.environments.events.types.environmentOffline.description' },
				{ id: 'environment_online', labelKey: 'settings.environments.events.types.environmentOnline.label', descriptionKey: 'settings.environments.events.types.environmentOnline.description' },
				{ id: 'disk_space_warning', labelKey: 'settings.environments.events.types.diskSpaceWarning.label', descriptionKey: 'settings.environments.events.types.diskSpaceWarning.description' }
			]
		}
	];

	function toggleEvent(eventId: string) {
		if (disabled) return;

		const newTypes = selectedEventTypes.includes(eventId)
			? selectedEventTypes.filter(t => t !== eventId)
			: [...selectedEventTypes, eventId];
		onchange(newTypes);
	}

	function toggleGroupAll(group: EventGroup) {
		if (disabled) return;

		const groupEventIds = group.events.map(e => e.id);
		const allSelected = groupEventIds.every(id => selectedEventTypes.includes(id));

		let newTypes: string[];
		if (allSelected) {
			// Deselect all from this group
			newTypes = selectedEventTypes.filter(id => !groupEventIds.includes(id));
		} else {
			// Select all from this group
			const toAdd = groupEventIds.filter(id => !selectedEventTypes.includes(id));
			newTypes = [...selectedEventTypes, ...toAdd];
		}
		onchange(newTypes);
	}

	function getGroupSelectedCount(group: EventGroup): number {
		return group.events.filter(e => selectedEventTypes.includes(e.id)).length;
	}
</script>

<div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
	{#each NOTIFICATION_EVENT_GROUPS as group (group.id)}
		{@const isCollapsed = collapsedGroups.has(group.id)}
		{@const selectedCount = getGroupSelectedCount(group)}
		{@const allSelected = selectedCount === group.events.length}
		{@const someSelected = selectedCount > 0 && selectedCount < group.events.length}
		{@const GroupIcon = group.icon}

		<div class="rounded-lg border bg-card">
			<!-- Group Header -->
			<div
				class="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors rounded-t-lg cursor-pointer"
				role="button"
				tabindex="0"
				onclick={() => toggleGroup(group.id)}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(group.id); } }}
			>
				<div class="flex items-center gap-2">
					{#if isCollapsed}
						<ChevronRight class="w-4 h-4 text-muted-foreground" />
					{:else}
						<ChevronDown class="w-4 h-4 text-muted-foreground" />
					{/if}
					<GroupIcon class="w-4 h-4 text-muted-foreground" />
					<span class="text-sm font-medium">{$t(group.labelKey)}</span>
					<span class="text-xs text-muted-foreground">
						({selectedCount}/{group.events.length})
					</span>
				</div>
				<button
					type="button"
					class="text-xs px-2 py-0.5 rounded border transition-colors {allSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'}"
					onclick={(e) => { e.stopPropagation(); toggleGroupAll(group); }}
					{disabled}
				>
					{allSelected ? $t('settings.environments.events.selection.all') : someSelected ? $t('settings.environments.events.selection.some') : $t('settings.environments.events.selection.none')}
				</button>
			</div>

			<!-- Group Events -->
			{#if !isCollapsed}
				<div class="ml-4 mb-2 border-l-2 border-muted bg-muted/20 rounded-bl">
					{#each group.events as event (event.id)}
						{@const isSelected = selectedEventTypes.includes(event.id)}
						<div class="flex items-center justify-between pl-3 pr-1 py-1.5 hover:bg-muted/40 transition-colors border-b border-border/30 last:border-b-0">
							<div class="flex-1 min-w-0 pr-2">
								<div class="text-xs font-medium">{$t(event.labelKey)}</div>
								<div class="text-2xs text-muted-foreground truncate">{$t(event.descriptionKey)}</div>
							</div>
							<TogglePill
								checked={isSelected}
								onchange={() => toggleEvent(event.id)}
								{disabled}
							/>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>
