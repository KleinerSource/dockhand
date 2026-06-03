<script lang="ts">
	import { browser } from '$app/environment';
	import { FolderOpen, X, Home, Server } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	type FileBrowserSource = 'dockhand' | 'environment';

	interface Props {
		currentPath?: string | null;
		currentSource?: FileBrowserSource;
		environmentId?: number | null;
		usesHawserFilesystem?: boolean;
		onSelect: (path: string, source: FileBrowserSource) => void;
	}

	let {
		currentPath = null,
		currentSource = 'dockhand',
		environmentId = null,
		usesHawserFilesystem = false,
		onSelect
	}: Props = $props();

	let dockhandLocations = $state<string[]>([]);
	let environmentLocations = $state<string[]>([]);
	let defaultBasePath = $state<string | null>(null);

	// Load recent locations and default base path on mount or environment change.
	$effect(() => {
		const envKey = environmentId;
		const hasHawser = usesHawserFilesystem;
		loadLocations();
		loadDefaultBasePath();
		if (hasHawser) {
			loadEnvironmentLocations(envKey);
		} else {
			environmentLocations = [];
		}
	});

	async function loadDefaultBasePath() {
		try {
			const response = await fetch('/api/stacks/base-path');
			if (response.ok) {
				const data = await response.json();
				defaultBasePath = data.basePath;
			}
		} catch (e) {
			console.error('Failed to load default base path:', e);
		}
	}

	async function loadLocations() {
		try {
			const response = await fetch('/api/settings/general');
			if (response.ok) {
				const settings = await response.json();
				dockhandLocations = settings.externalStackPaths || [];
			}
		} catch (e) {
			console.error('Failed to load recent locations:', e);
		}
	}

	function getEnvironmentStorageKey(envId: number | null): string | null {
		return envId ? `dockhand:recent-stack-paths:env:${envId}` : null;
	}

	function loadEnvironmentLocations(envId: number | null) {
		if (!browser) return;
		const key = getEnvironmentStorageKey(envId);
		if (!key) {
			environmentLocations = [];
			return;
		}
		try {
			environmentLocations = JSON.parse(localStorage.getItem(key) || '[]');
		} catch {
			environmentLocations = [];
		}
	}

	async function saveLocations(newLocations: string[], source: FileBrowserSource) {
		if (source === 'environment') {
			const key = getEnvironmentStorageKey(environmentId);
			if (browser && key) {
				localStorage.setItem(key, JSON.stringify(newLocations));
			}
			return;
		}

		try {
			await fetch('/api/settings/general', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ externalStackPaths: newLocations })
			});
		} catch (e) {
			console.error('Failed to save recent locations:', e);
		}
	}

	async function handleRemove(path: string, source: FileBrowserSource) {
		const currentLocations = source === 'environment' ? environmentLocations : dockhandLocations;
		const newLocations = currentLocations.filter(p => p !== path);
		if (source === 'environment') {
			environmentLocations = newLocations;
		} else {
			dockhandLocations = newLocations;
		}
		await saveLocations(newLocations, source);
	}

	export async function addLocation(path: string, source: FileBrowserSource = currentSource) {
		if (!path) return;
		const currentLocations = source === 'environment' ? environmentLocations : dockhandLocations;
		if (currentLocations.includes(path)) return;
		const newLocations = [path, ...currentLocations].slice(0, 10);
		if (source === 'environment') {
			environmentLocations = newLocations;
		} else {
			dockhandLocations = newLocations;
		}
		await saveLocations(newLocations, source);
	}

	export function getFirstLocation(source: FileBrowserSource = currentSource): string | null {
		return (source === 'environment' ? environmentLocations : dockhandLocations)[0] || null;
	}

	function getLocationName(location: string): string {
		return location.split(/[\\/]/).pop() || location;
	}
</script>

<div class="w-56 border-r p-3 overflow-y-auto shrink-0">
	<h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{$t('stacks.recentLocations.title')}</h3>
	<div class="space-y-1">
		<!-- Default Dockhand location (always shown, not removable) -->
		{#if defaultBasePath}
			<button
				type="button"
				class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted text-left {currentSource === 'dockhand' && currentPath === defaultBasePath ? 'bg-muted' : ''}"
				onclick={() => onSelect(defaultBasePath!, 'dockhand')}
			>
				<Home class="w-4 h-4 shrink-0 text-sky-500" />
				<span class="truncate" title={defaultBasePath}>{$t('stacks.recentLocations.dockhandDefault')}</span>
			</button>
		{/if}

		{#if usesHawserFilesystem && environmentId}
			<button
				type="button"
				class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted text-left {currentSource === 'environment' && currentPath === '/' ? 'bg-muted' : ''}"
				onclick={() => onSelect('/', 'environment')}
			>
				<Server class="w-4 h-4 shrink-0 text-emerald-500" />
				<span class="truncate" title="/">{$t('stacks.recentLocations.agentRoot')}</span>
			</button>
		{/if}

		<!-- Recent locations -->
		{#each dockhandLocations.filter(l => l !== defaultBasePath) as location}
			<div class="group flex items-center gap-1">
				<button
					type="button"
					class="flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted text-left truncate {currentSource === 'dockhand' && currentPath === location ? 'bg-muted' : ''}"
					onclick={() => onSelect(location, 'dockhand')}
				>
					<FolderOpen class="w-4 h-4 shrink-0 text-muted-foreground" />
					<span class="truncate" title={location}>{getLocationName(location)}</span>
				</button>
				<button
					type="button"
					class="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-opacity"
					onclick={() => handleRemove(location, 'dockhand')}
					title={$t('stacks.recentLocations.removeFromRecent')}
				>
					<X class="w-3 h-3 text-muted-foreground" />
				</button>
			</div>
		{/each}

		{#if usesHawserFilesystem && environmentId}
			{#each environmentLocations.filter(l => l !== '/') as location}
				<div class="group flex items-center gap-1">
					<button
						type="button"
						class="flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted text-left truncate {currentSource === 'environment' && currentPath === location ? 'bg-muted' : ''}"
						onclick={() => onSelect(location, 'environment')}
					>
						<FolderOpen class="w-4 h-4 shrink-0 text-muted-foreground" />
						<span class="truncate" title={location}>{getLocationName(location)}</span>
					</button>
					<button
						type="button"
						class="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-opacity"
						onclick={() => handleRemove(location, 'environment')}
						title={$t('stacks.recentLocations.removeFromRecent')}
					>
						<X class="w-3 h-3 text-muted-foreground" />
					</button>
				</div>
			{/each}
		{/if}

		{#if !defaultBasePath && dockhandLocations.length === 0 && environmentLocations.length === 0}
			<p class="text-xs text-muted-foreground italic px-2">
				{$t('stacks.recentLocations.empty')}
			</p>
		{/if}
	</div>
</div>
