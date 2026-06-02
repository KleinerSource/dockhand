<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { TogglePill } from '$lib/components/ui/toggle-pill';
	import CronEditor from '$lib/components/cron-editor.svelte';
	import VulnerabilityCriteriaSelector, { type VulnerabilityCriteria } from '$lib/components/VulnerabilityCriteriaSelector.svelte';
	import { appendEnvParam } from '$lib/stores/environment';
	import { AlertCircle, Loader2, RefreshCw } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { t, translate } from '$lib/i18n';

	interface Props {
		open: boolean;
		containers: Array<{ id: string; name: string }>;
		envId: number | null;
		envHasScanning?: boolean;
		defaultVulnerabilityCriteria?: VulnerabilityCriteria;
		onClose: () => void;
		onComplete: () => void;
	}

	let {
		open = $bindable(),
		containers,
		envId,
		envHasScanning = false,
		defaultVulnerabilityCriteria = 'never',
		onClose,
		onComplete
	}: Props = $props();

	let enabled = $state(true);
	let cronExpression = $state('0 3 * * *');
	let vulnerabilityCriteria = $state<VulnerabilityCriteria>('never');
	let saving = $state(false);
	let errorMessage = $state('');
	let wasOpen = false;

	const selectedCount = $derived(containers.length);
	const saveDisabled = $derived(saving || selectedCount === 0 || (enabled && !isValidCron(cronExpression)));

	function isValidCron(cron: string): boolean {
		const parts = cron.trim().split(/\s+/);
		if (parts.length !== 5 && parts.length !== 6) return false;

		const cronFieldPattern = /^(\*|(\*\/\d+)|\d+(-\d+)?(,\d+(-\d+)?)*)$/;
		return parts.every((part) => cronFieldPattern.test(part));
	}

	$effect(() => {
		if (open && !wasOpen) {
			enabled = true;
			cronExpression = '0 3 * * *';
			vulnerabilityCriteria = defaultVulnerabilityCriteria;
			errorMessage = '';
			saving = false;
		}
		wasOpen = open;
	});

	function handleClose() {
		if (saving) return;
		open = false;
		errorMessage = '';
		onClose();
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) {
			handleClose();
		}
	}

	async function saveSettings() {
		if (!envId || saveDisabled) return;

		saving = true;
		errorMessage = '';

		try {
			const response = await fetch(appendEnvParam('/api/auto-update', envId), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					containerNames: containers.map((container) => container.name),
					enabled,
					cronExpression: enabled ? cronExpression : null,
					vulnerabilityCriteria: enabled && envHasScanning ? vulnerabilityCriteria : 'never'
				})
			});

			if (!response.ok) {
				const data = await response.json().catch(() => null);
				throw new Error(data?.error || translate('containers.batchAutoUpdate.saveFailed'));
			}

			toast.success(
				enabled
					? translate('containers.batchAutoUpdate.enabledToast', { count: selectedCount })
					: translate('containers.batchAutoUpdate.disabledToast', { count: selectedCount })
			);
			saving = false;
			onComplete();
			handleClose();
		} catch (error: any) {
			errorMessage = error?.message || translate('containers.batchAutoUpdate.saveFailed');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="w-full max-w-lg" onInteractOutside={(e) => { if (saving) e.preventDefault(); }}>
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<RefreshCw class="w-5 h-5 text-emerald-500" />
				{$t('containers.batchAutoUpdate.title')}
			</Dialog.Title>
			<Dialog.Description>
				{$t('containers.batchAutoUpdate.description', { count: selectedCount })}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-2">
			<div class="flex items-center justify-between gap-3 rounded-lg border p-3">
				<div class="space-y-1">
					<Label class="text-sm">{$t('containers.batchAutoUpdate.modeLabel')}</Label>
					<p class="text-xs text-muted-foreground">
						{enabled ? $t('containers.batchAutoUpdate.enableAutomatic') : $t('containers.batchAutoUpdate.disableAutomatic')}
					</p>
				</div>
				<TogglePill
					bind:checked={enabled}
					onLabel={$t('common.actions.enable')}
					offLabel={$t('common.actions.disable')}
				/>
			</div>

			{#if enabled}
				<div class="space-y-2">
					<Label class="text-sm">{$t('containers.batchAutoUpdate.scheduleLabel')}</Label>
					<CronEditor
						value={cronExpression}
						onchange={(cron) => {
							cronExpression = cron;
						}}
					/>
				</div>

				{#if envHasScanning}
					<div class="space-y-2">
						<Label class="text-sm">{$t('containers.autoUpdate.vulnerabilityCriteria')}</Label>
						<VulnerabilityCriteriaSelector bind:value={vulnerabilityCriteria} />
						<p class="text-xs text-muted-foreground">
							{$t('containers.autoUpdate.blockByVulnerabilityCriteria')}
						</p>
					</div>
				{/if}
			{/if}

			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<Label class="text-sm">{$t('containers.batchAutoUpdate.selectedContainers')}</Label>
					<Badge variant="secondary">{selectedCount}</Badge>
				</div>
				<div class="max-h-32 overflow-y-auto rounded-md border divide-y">
					{#if containers.length === 0}
						<div class="px-3 py-2 text-sm text-muted-foreground">
							{$t('containers.batchAutoUpdate.empty')}
						</div>
					{:else}
						{#each containers as container (container.id)}
							<div class="px-3 py-2 text-sm font-mono truncate" title={container.name}>
								{container.name}
							</div>
						{/each}
					{/if}
				</div>
			</div>

			{#if errorMessage}
				<div class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
					<AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
					<span class="break-words">{errorMessage}</span>
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleClose} disabled={saving}>
				{$t('common.actions.cancel')}
			</Button>
			<Button onclick={saveSettings} disabled={saveDisabled}>
				{#if saving}
					<Loader2 class="w-4 h-4 mr-2 animate-spin" />
					{$t('containers.batchAutoUpdate.saving')}
				{:else}
					{$t('containers.batchAutoUpdate.save')}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
