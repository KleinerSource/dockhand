<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Import, Loader2, Play, Info, ServerCog } from 'lucide-svelte';
	import FilesystemBrowser, { type FileEntry } from './FilesystemBrowser.svelte';
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import yaml from 'js-yaml';
	import { toast } from 'svelte-sonner';
	import { currentEnvironment, environments } from '$lib/stores/environment';
	import EnvironmentIcon from '$lib/components/EnvironmentIcon.svelte';
	import { t, translate } from '$lib/i18n';

	interface DiscoveredStack {
		name: string;
		composePath: string;
		envPath: string | null;
		sourceDir?: string;
		serviceCount?: number;
		running?: boolean;
		containerCount?: number;
	}

	interface Props {
		open: boolean;
		onClose: () => void;
		onAdopted?: () => void;
	}

	let { open = $bindable(), onClose, onAdopted }: Props = $props();

	// View state: 'browse' | 'results'
	let view = $state<'browse' | 'results'>('browse');

	// Reference to filesystem browser
	let filesystemBrowser = $state<{ getCurrentPath: () => string | null; addRecentLocation: (path: string) => Promise<void> } | null>(null);

	// Scan results state
	let scanResults = $state<DiscoveredStack[]>([]);
	let scanning = $state(false);

	// Selection and adopt state
	let stackSelections = $state<Map<string, boolean>>(new Map());
	let adopting = $state(false);

	// Preview dialog state (for single file click)
	let showPreview = $state(false);
	let previewFile = $state<FileEntry | null>(null);
	let previewContent = $state<string | null>(null);
	let previewServiceCount = $state<number>(0);
	let previewComposeName = $state<string | null>(null);
	let loadingPreview = $state(false);

	// Use current environment from store
	const envId = $derived($currentEnvironment?.id ?? null);
	const envName = $derived($currentEnvironment?.name ?? translate('common.states.unknown'));
	// Look up the icon from the environments list since currentEnvironment doesn't store it
	const currentEnvData = $derived($environments.find(e => e.id === envId));
	const envIcon = $derived(currentEnvData?.icon || 'globe');
	const usesHawserFilesystem = $derived(
		currentEnvData?.connectionType === 'hawser-standard' ||
		currentEnvData?.connectionType === 'hawser-edge'
	);

	// Reset when modal closes
	$effect(() => {
		if (!open) {
			view = 'browse';
			scanResults = [];
			stackSelections = new Map();
			showPreview = false;
			previewFile = null;
			previewContent = null;
			previewServiceCount = 0;
			previewComposeName = null;
		}
	});

	async function handleFilePreview(entry: FileEntry) {
		previewFile = entry;
		showPreview = true;
		loadingPreview = true;
		previewContent = null;
		previewServiceCount = 0;
		previewComposeName = null;

		try {
			const params = new URLSearchParams({ path: entry.path });
			if (envId) params.set('env', String(envId));
			const res = await fetch(`/api/system/files/content?${params}`);
			if (res.ok) {
				const data = await res.json();
				previewContent = data.content || '';
				// Parse compose metadata (name + service count)
				try {
					const doc = yaml.load(previewContent) as Record<string, unknown> | null;
					if (typeof doc?.name === 'string' && doc.name.trim()) {
						previewComposeName = doc.name.trim();
					}
					if (doc?.services && typeof doc.services === 'object') {
						previewServiceCount = Object.keys(doc.services).length;
					}
				} catch {
					previewServiceCount = 0;
				}
			}
		} catch (e) {
			console.error('Failed to load preview:', e);
		} finally {
			loadingPreview = false;
		}
	}

	function confirmAdoptFromPreview() {
		if (previewFile) {
			adoptSingleFile(previewFile);
			showPreview = false;
		}
	}

	async function handleScanDirectory(path: string) {
		scanning = true;

		try {
			const res = await fetch('/api/stacks/scan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path, env: envId ?? undefined })
			});

			const data = await res.json();

			if (!res.ok) {
				toast.error(data.error || translate('stacks.import.toasts.scanFailed'));
				return;
			}

			const discovered: DiscoveredStack[] = data.discovered || [];

			// Detect running stacks on current environment
			if (envId && discovered.length > 0) {
				try {
					const runningRes = await fetch(`/api/stacks?env=${envId}`);
					if (runningRes.ok) {
						const runningStacks: Array<{ name: string; containers?: any[] }> = await runningRes.json();
						const runningMap = new Map(
							runningStacks.map((s) => [s.name.toLowerCase(), s])
						);

						for (const stack of discovered) {
							const runningStack = runningMap.get(stack.name.toLowerCase());
							if (runningStack) {
								stack.running = true;
								stack.containerCount = runningStack.containers?.length || 0;
							}
						}
					}
				} catch (e) {
					console.error('Failed to detect running stacks:', e);
				}
			}

			scanResults = discovered;
			const skippedCount = (data.skipped || []).length;

			if (discovered.length === 0) {
				if (skippedCount > 0) {
					toast.info(translate('stacks.import.toasts.allAlreadyAdopted', { count: skippedCount }));
				} else {
					toast.info(translate('stacks.import.toasts.noneFound'));
				}
			} else {
				const selections = new Map<string, boolean>();
				for (const stack of discovered) {
					// Don't pre-select stacks that are already running on this environment
					selections.set(stack.composePath, !stack.running);
				}
				stackSelections = selections;
				view = 'results';
			}

			await filesystemBrowser?.addRecentLocation(path);

		} catch (e) {
			toast.error(e instanceof Error ? e.message : translate('stacks.import.toasts.scanFailed'));
		} finally {
			scanning = false;
		}
	}

	async function adoptSingleFile(entry: FileEntry) {
		if (!envId) {
			toast.error(translate('stacks.import.toasts.noEnvironment'));
			return;
		}

		adopting = true;

		try {
			const parentDir = entry.path.replace(/\/[^/]+$/, '');
			// Use compose `name:` property if available, otherwise fall back to directory name
			const rawName = previewComposeName || parentDir.split('/').pop() || 'adopted-stack';
			const stackName = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'adopted-stack';
			const envFilePath = `${parentDir}/.env`;

			const stack: DiscoveredStack = {
				name: stackName,
				composePath: entry.path,
				envPath: envFilePath,
				sourceDir: parentDir
			};

			const res = await fetch('/api/stacks/adopt', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					stacks: [stack],
					environmentId: envId
				})
			});

			const data = await res.json();

			if (!res.ok) {
				toast.error(data.error || translate('stacks.import.toasts.adoptFailed'));
				return;
			}

			if (data.adopted?.length > 0) {
				toast.success(translate('stacks.import.toasts.adoptedStack', { name: data.adopted[0] }));
				await filesystemBrowser?.addRecentLocation(parentDir);
				onAdopted?.();
				handleClose();
			} else if (data.failed?.length > 0) {
				toast.error(translate('stacks.import.toasts.failedWithMessage', { error: data.failed[0].error }));
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : translate('stacks.import.toasts.adoptFailed'));
		} finally {
			adopting = false;
		}
	}

	async function handleAdoptSelected() {
		if (!envId || stackSelections.size === 0) return;

		const selectedStacks = scanResults.filter(s => stackSelections.get(s.composePath));
		if (selectedStacks.length === 0) return;

		adopting = true;

		try {
			const res = await fetch('/api/stacks/adopt', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					stacks: selectedStacks,
					environmentId: envId
				})
			});

			const data = await res.json();

			if (!res.ok) {
				toast.error(data.error || translate('stacks.import.toasts.adoptManyFailed'));
				return;
			}

			if (data.adopted?.length > 0) {
				toast.success(translate('stacks.import.toasts.adoptedStacks', { count: data.adopted.length }));
				onAdopted?.();
				handleClose();
			}
			if (data.failed?.length > 0) {
				toast.error(translate('stacks.import.toasts.failedCount', { count: data.failed.length }));
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : translate('stacks.import.toasts.adoptManyFailed'));
		} finally {
			adopting = false;
		}
	}

	function toggleStack(composePath: string) {
		const newMap = new Map(stackSelections);
		newMap.set(composePath, !newMap.get(composePath));
		stackSelections = newMap;
	}

	function toggleAll() {
		const allSelected = scanResults.every(s => stackSelections.get(s.composePath));
		const newMap = new Map<string, boolean>();
		for (const stack of scanResults) {
			newMap.set(stack.composePath, !allSelected);
		}
		stackSelections = newMap;
	}

	function handleClose() {
		open = false;
		onClose();
	}

	function goBackToBrowse() {
		view = 'browse';
		scanResults = [];
		stackSelections = new Map();
	}

	const selectedCount = $derived([...stackSelections.values()].filter(v => v).length);
	const allSelected = $derived(scanResults.length > 0 && scanResults.every(s => stackSelections.get(s.composePath)));

	// Browser title with environment info
	const browserTitle = $derived.by(() => {
		return envName
			? translate('stacks.import.browserTitleWithEnvironment', { environment: envName })
			: translate('stacks.import.browserTitle');
	});

	const browserDescription = $derived.by(() => {
		if (usesHawserFilesystem) {
			return translate('stacks.import.remoteDescription');
		}
		return translate('stacks.import.browserDescription');
	});
</script>

{#if view === 'browse'}
	<!-- File Browser View - using FilesystemBrowser component -->
	<FilesystemBrowser
		bind:this={filesystemBrowser}
		bind:open
		title={browserTitle}
		icon={Import}
		description={browserDescription}
		selectMode="adopt"
		highlightFilter={/\.ya?ml$/i}
		onFilePreview={handleFilePreview}
		onScanDirectory={handleScanDirectory}
		environmentId={envId}
		{scanning}
		onSelect={() => {}}
		onClose={handleClose}
	/>
{:else}
	<!-- Scan Results View -->
	<Dialog.Root bind:open onOpenChange={(o) => !o && handleClose()}>
		<Dialog.Content class="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
			<Dialog.Header class="px-6 py-4 border-b shrink-0">
				<Dialog.Title class="flex items-center gap-2">
					<Import class="w-5 h-5" />
					{$t('stacks.import.selectStacksTitle')}
					<EnvironmentIcon icon={envIcon} envId={envId} class="w-4 h-4 text-muted-foreground" />
					<span class="text-muted-foreground font-normal">{envName}</span>
				</Dialog.Title>
				<Dialog.Description>
					{$t('stacks.import.foundDescription', { count: scanResults.length, environment: envName })}
				</Dialog.Description>
			</Dialog.Header>

			<div class="flex-1 flex flex-col min-h-0">
				<!-- Stack list -->
				<div class="flex-1 overflow-y-auto p-4">
					<div class="space-y-2">
						{#each scanResults as stack}
							{@const isSelected = stackSelections.get(stack.composePath)}
							{@const countsMismatch = stack.running && stack.serviceCount && stack.containerCount !== stack.serviceCount}
							<div
								class="flex items-start gap-3 p-3 rounded-lg border {isSelected ? 'border-primary/50 bg-primary/5' : 'border-border'}"
							>
								<Checkbox
									checked={isSelected}
									onCheckedChange={() => toggleStack(stack.composePath)}
									class="mt-0.5"
								/>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<span class="font-medium truncate">{stack.name}</span>
										{#if stack.serviceCount}
											<Badge variant="outline" class="text-xs">
												{$t(stack.serviceCount === 1 ? 'stacks.import.serviceCountOne' : 'stacks.import.serviceCountMany', { count: stack.serviceCount })}
											</Badge>
										{/if}
										{#if stack.running}
											<Badge variant="default" class="text-xs {countsMismatch ? 'bg-amber-600' : 'bg-green-600'}">
												<Play class="w-3 h-3 mr-1" />
												{$t('stacks.import.runningCount', { count: stack.containerCount ?? 0 })}
											</Badge>
										{/if}
									</div>
									<p class="text-xs text-muted-foreground truncate mt-0.5" title={stack.composePath}>
										{stack.composePath}
									</p>
									{#if stack.envPath}
										<p class="text-xs text-muted-foreground truncate" title={stack.envPath}>
											.env: {stack.envPath}
										</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
				<!-- Adopt info -->
				<div class="px-4 py-3 border-t shrink-0 space-y-2">
					{#if usesHawserFilesystem}
						<div class="flex items-start gap-2.5 text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2.5">
							<ServerCog class="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
							<span class="text-blue-700 dark:text-blue-300">{$t('stacks.import.remoteFilesPrefix')} <span class="font-medium">{$t('stacks.import.dockhandHost')}</span>, {$t('stacks.import.remoteFilesMiddle', { environment: envName })} {$t('stacks.import.remoteFilesSuffix', { environment: envName })}</span>
						</div>
					{/if}
					<div class="flex items-start gap-2.5 text-xs bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2.5">
						<Info class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
						<span><span class="font-medium text-amber-600 dark:text-amber-400">{$t('stacks.import.adoptInfoTitle')}</span> <span class="text-zinc-600 dark:text-zinc-400">{$t('stacks.import.adoptManyInfo')}</span></span>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t flex items-center justify-between shrink-0">
				<div class="flex items-center gap-3">
					<Checkbox
						checked={allSelected}
						onCheckedChange={toggleAll}
					/>
					<span class="text-sm text-muted-foreground">
						{$t('stacks.import.selectedCount', { selected: selectedCount, total: scanResults.length })}
					</span>
				</div>
				<div class="flex gap-2">
					<Button variant="outline" onclick={goBackToBrowse}>
						{$t('common.actions.back')}
					</Button>
					<Button variant="outline" onclick={handleClose}>
						{$t('common.actions.cancel')}
					</Button>
					<Button
						variant="default"
						onclick={handleAdoptSelected}
						disabled={adopting || selectedCount === 0}
					>
						{#if adopting}
							<Loader2 class="w-4 h-4 mr-2 animate-spin" />
							{$t('stacks.import.adopting')}
						{:else}
							<Import class="w-4 h-4" />
							{$t('stacks.import.adoptSelected', { count: selectedCount })}
						{/if}
					</Button>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Preview dialog for single file adopt -->
<Dialog.Root bind:open={showPreview}>
	<Dialog.Content class="max-w-3xl h-[70vh] flex flex-col p-0 gap-0">
		<Dialog.Header class="px-5 py-4 border-b shrink-0">
			<Dialog.Title class="flex items-center gap-2">
				<Import class="w-5 h-5" />
				{$t('stacks.import.previewTitle')}
			</Dialog.Title>
			<Dialog.Description>
				{$t('stacks.import.previewDescription')}
			</Dialog.Description>
		</Dialog.Header>

		{#if previewFile}
			<div class="flex-1 flex flex-col min-h-0 overflow-hidden">
				<!-- Stack info bar -->
				<div class="px-5 py-3 border-b bg-muted/30 flex items-center gap-4 shrink-0">
					<div class="flex items-center gap-2">
						<span class="text-sm text-muted-foreground">{$t('common.labels.stack')}:</span>
						<span class="font-medium">{previewComposeName || previewFile.path.replace(/\/[^/]+$/, '').split('/').pop() || $t('common.states.unknown')}</span>
						{#if previewServiceCount > 0}
							<Badge variant="outline" class="text-xs">
								{$t(previewServiceCount === 1 ? 'stacks.import.serviceCountOne' : 'stacks.import.serviceCountMany', { count: previewServiceCount })}
							</Badge>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<code class="text-xs bg-muted px-2 py-1 rounded truncate block">{previewFile.path}</code>
					</div>
				</div>

				<!-- Preview content with syntax highlighting -->
				<div class="flex-1 min-h-0 p-3">
					{#if loadingPreview}
						<div class="flex items-center justify-center h-full">
							<Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
						</div>
					{:else if previewContent}
						<CodeEditor
							value={previewContent}
							language="yaml"
							theme="dark"
							readonly={true}
							class="h-full rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700"
						/>
					{/if}
				</div>

				<!-- Adopt info -->
				<div class="px-5 py-3 border-t shrink-0 space-y-2">
					{#if usesHawserFilesystem}
						<div class="flex items-start gap-2.5 text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2.5">
							<ServerCog class="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
							<span class="text-blue-700 dark:text-blue-300">{$t('stacks.import.remoteFilePrefix')} <span class="font-medium">{$t('stacks.import.dockhandHost')}</span>, {$t('stacks.import.remoteFilesMiddle', { environment: envName })} {$t('stacks.import.remoteFileSuffix', { environment: envName })}</span>
						</div>
					{/if}
					<div class="flex items-start gap-2.5 text-xs bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2.5">
						<Info class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
						<span><span class="font-medium text-amber-600 dark:text-amber-400">{$t('stacks.import.adoptInfoTitle')}</span> <span class="text-zinc-600 dark:text-zinc-400">{$t('stacks.import.adoptOneInfo')}</span></span>
					</div>
				</div>
			</div>
		{/if}

		<div class="px-5 py-3 border-t flex justify-end gap-2 shrink-0">
			<Button variant="outline" onclick={() => showPreview = false}>
				{$t('common.actions.cancel')}
			</Button>
			<Button onclick={confirmAdoptFromPreview} disabled={adopting}>
				{#if adopting}
					<Loader2 class="w-4 h-4 mr-2 animate-spin" />
					{$t('stacks.import.adopting')}
				{:else}
					<Import class="w-4 h-4" />
					{$t('stacks.import.adoptStack')}
				{/if}
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
