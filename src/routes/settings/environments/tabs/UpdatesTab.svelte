<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { TogglePill } from '$lib/components/ui/toggle-pill';
	import CronEditor from '$lib/components/cron-editor.svelte';
	import TimezoneSelector from '$lib/components/TimezoneSelector.svelte';
	import VulnerabilityCriteriaSelector, { type VulnerabilityCriteria } from '$lib/components/VulnerabilityCriteriaSelector.svelte';
	import { CircleFadingArrowUp, CircleArrowUp, RefreshCw, Info, Trash2 } from 'lucide-svelte';
	import { formatDateTime } from '$lib/stores/settings';
	import { formatBytes } from '$lib/utils/format';
	import { t } from '$lib/i18n';

	interface Props {
		// Update check settings
		updateCheckLoading: boolean;
		updateCheckEnabled: boolean;
		updateCheckCron: string;
		updateCheckAutoUpdate: boolean;
		updateCheckVulnerabilityCriteria: VulnerabilityCriteria;
		scannerEnabled: boolean;
		// Image prune settings
		imagePruneLoading: boolean;
		imagePruneEnabled: boolean;
		imagePruneCron: string;
		imagePruneMode: 'dangling' | 'all';
		imagePruneLastPruned?: string;
		imagePruneLastResult?: { spaceReclaimed: number; imagesRemoved: number };
		// Timezone
		timezone: string;
	}

	let {
		updateCheckLoading,
		updateCheckEnabled = $bindable(),
		updateCheckCron = $bindable(),
		updateCheckAutoUpdate = $bindable(),
		updateCheckVulnerabilityCriteria = $bindable(),
		scannerEnabled,
		imagePruneLoading,
		imagePruneEnabled = $bindable(),
		imagePruneCron = $bindable(),
		imagePruneMode = $bindable(),
		imagePruneLastPruned,
		imagePruneLastResult,
		timezone = $bindable()
	}: Props = $props();

</script>

<!-- Scheduled Update Check Section -->
<div class="space-y-4">
	<div class="text-sm font-medium">
		{$t('settings.environments.updates.scheduledUpdateCheck')}
	</div>
	<p class="text-xs text-muted-foreground">
		{$t('settings.environments.updates.scheduledUpdateCheckDescription')}
	</p>

	{#if updateCheckLoading}
		<div class="flex items-center justify-center py-4">
			<RefreshCw class="w-5 h-5 animate-spin text-muted-foreground" />
		</div>
	{:else}
		<div class="flex items-start gap-2">
			<CircleFadingArrowUp class="w-4 h-4 text-green-500 glow-green mt-0.5 shrink-0" />
			<div class="flex-1">
				<Label>{$t('settings.environments.updates.enableScheduledCheck')}</Label>
				<p class="text-xs text-muted-foreground">{$t('settings.environments.updates.enableScheduledCheckDescription')}</p>
			</div>
			<TogglePill bind:checked={updateCheckEnabled} />
		</div>

		{#if updateCheckEnabled}
			<div class="flex items-start gap-2">
				<div class="w-4 shrink-0"></div>
				<div class="flex-1 space-y-2">
					<Label>{$t('settings.environments.updates.schedule')}</Label>
					<CronEditor value={updateCheckCron} onchange={(cron) => updateCheckCron = cron} />
				</div>
			</div>

			<div class="flex items-start gap-2">
				<CircleArrowUp class="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
				<div class="flex-1">
					<Label>{$t('settings.environments.updates.autoUpdateContainers')}</Label>
					<p class="text-xs text-muted-foreground">
						{$t('settings.environments.updates.autoUpdateContainersDescription')}
					</p>
				</div>
				<TogglePill bind:checked={updateCheckAutoUpdate} />
			</div>

			{#if updateCheckAutoUpdate && scannerEnabled}
				<div class="flex items-start gap-2">
					<div class="w-4 shrink-0"></div>
					<div class="flex-1">
						<Label>{$t('settings.environments.updates.blockVulnerableUpdates')}</Label>
						<p class="text-xs text-muted-foreground">
							{$t('settings.environments.updates.blockVulnerableUpdatesDescription')}
						</p>
					</div>
					<VulnerabilityCriteriaSelector
						bind:value={updateCheckVulnerabilityCriteria}
						class="w-[200px]"
					/>
				</div>
			{/if}

			<div class="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 flex items-start gap-2">
				<Info class="w-3 h-3 mt-0.5 shrink-0" />
				{#if updateCheckAutoUpdate}
					{#if scannerEnabled && updateCheckVulnerabilityCriteria !== 'never'}
						<span>{$t('settings.environments.updates.autoUpdateWithScanInfo')}</span>
					{:else}
						<span>{$t('settings.environments.updates.autoUpdateInfo')}</span>
					{/if}
				{:else}
					<span>{$t('settings.environments.updates.notifyOnlyInfo')}</span>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<!-- Image Pruning Section -->
<div class="space-y-4 pt-4 border-t">
	<div class="text-sm font-medium">
		{$t('settings.environments.updates.automaticImagePruning')}
	</div>
	<p class="text-xs text-muted-foreground">
		{$t('settings.environments.updates.automaticImagePruningDescription')}
	</p>

	{#if imagePruneLoading}
		<div class="flex items-center justify-center py-4">
			<RefreshCw class="w-5 h-5 animate-spin text-muted-foreground" />
		</div>
	{:else}
		<div class="flex items-start gap-2">
			<Trash2 class="w-4 h-4 text-amber-500 glow-amber mt-0.5 shrink-0" />
			<div class="flex-1">
				<Label>{$t('settings.environments.updates.enableImagePruning')}</Label>
				<p class="text-xs text-muted-foreground">{$t('settings.environments.updates.enableImagePruningDescription')}</p>
			</div>
			<TogglePill bind:checked={imagePruneEnabled} />
		</div>

		{#if imagePruneEnabled}
			<div class="flex items-start gap-2">
				<div class="w-4 shrink-0"></div>
				<div class="flex-1 space-y-2">
					<Label>{$t('settings.environments.updates.schedule')}</Label>
					<CronEditor value={imagePruneCron} onchange={(cron) => imagePruneCron = cron} />
				</div>
			</div>

			<div class="flex items-start gap-2">
				<div class="w-4 shrink-0"></div>
				<div class="flex-1 space-y-2">
					<Label>{$t('settings.environments.updates.pruneMode')}</Label>
					<Select.Root type="single" bind:value={imagePruneMode}>
						<Select.Trigger class="w-full">
							{imagePruneMode === 'dangling' ? $t('settings.environments.updates.danglingImagesOnly') : $t('settings.environments.updates.allUnusedImages')}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="dangling">{$t('settings.environments.updates.danglingImagesOnly')}</Select.Item>
							<Select.Item value="all">{$t('settings.environments.updates.allUnusedImages')}</Select.Item>
						</Select.Content>
					</Select.Root>
					<p class="text-xs text-muted-foreground">
						{#if imagePruneMode === 'dangling'}
							{$t('settings.environments.updates.danglingImagesDescription')}
						{:else}
							{$t('settings.environments.updates.allUnusedImagesDescription')}
						{/if}
					</p>
				</div>
			</div>

			{#if imagePruneLastPruned}
				<div class="flex items-start gap-2">
					<div class="w-4 shrink-0"></div>
					<div class="flex-1">
						<p class="text-xs text-muted-foreground">
							{$t('settings.environments.updates.lastPruned', { date: formatDateTime(imagePruneLastPruned) })}
							{#if imagePruneLastResult}
								{$t('settings.environments.updates.pruneResult', { count: imagePruneLastResult.imagesRemoved, bytes: formatBytes(imagePruneLastResult.spaceReclaimed) })}
							{/if}
						</p>
					</div>
				</div>
			{/if}

			<div class="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 flex items-start gap-2">
				<Info class="w-3 h-3 mt-0.5 shrink-0" />
				<span>{$t('settings.environments.updates.usedImagesPreserved')}</span>
			</div>
		{/if}
	{/if}
</div>

<!-- Timezone selector -->
<div class="space-y-2">
	<Label>{$t('settings.environments.updates.timezone')}</Label>
	<TimezoneSelector
		bind:value={timezone}
		id="edit-env-timezone"
	/>
	<p class="text-xs text-muted-foreground">
		{$t('settings.environments.updates.timezoneDescription')}
	</p>
</div>
