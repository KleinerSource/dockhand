<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { TogglePill } from '$lib/components/ui/toggle-pill';
	import * as Select from '$lib/components/ui/select';
	import { Percent, HardDrive } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	interface Props {
		collectActivity: boolean;
		collectMetrics: boolean;
		highlightChanges: boolean;
		diskWarningEnabled: boolean;
		diskWarningMode: 'percentage' | 'absolute';
		diskWarningThreshold: number;
		diskWarningThresholdGb: number;
	}

	let {
		collectActivity = $bindable(),
		collectMetrics = $bindable(),
		highlightChanges = $bindable(),
		diskWarningEnabled = $bindable(),
		diskWarningMode = $bindable(),
		diskWarningThreshold = $bindable(),
		diskWarningThresholdGb = $bindable()
	}: Props = $props();
</script>

<div class="flex items-start gap-3">
	<div class="flex-1">
		<Label>{$t('settings.environments.activity.collectActivity')}</Label>
		<p class="text-xs text-muted-foreground">{$t('settings.environments.activity.collectActivityDescription')}</p>
	</div>
	<TogglePill bind:checked={collectActivity} />
</div>
<div class="flex items-start gap-3">
	<div class="flex-1">
		<Label>{$t('settings.environments.activity.collectMetrics')}</Label>
		<p class="text-xs text-muted-foreground">{$t('settings.environments.activity.collectMetricsDescription')}</p>
	</div>
	<TogglePill bind:checked={collectMetrics} />
</div>
<div class="flex items-start gap-3">
	<div class="flex-1">
		<Label>{$t('settings.environments.activity.highlightChanges')}</Label>
		<p class="text-xs text-muted-foreground">{$t('settings.environments.activity.highlightChangesDescription')}</p>
	</div>
	<TogglePill bind:checked={highlightChanges} />
</div>

<div class="border-t pt-4 mt-2 space-y-3">
	<div class="flex items-start gap-3">
		<div class="flex-1">
			<Label>{$t('settings.environments.activity.diskWarnings')}</Label>
			<p class="text-xs text-muted-foreground">{$t('settings.environments.activity.diskWarningsDescription')}</p>
		</div>
		<TogglePill bind:checked={diskWarningEnabled} />
	</div>

	{#if diskWarningEnabled}
		<div class="flex items-center gap-3">
			<Select.Root type="single" value={diskWarningMode} onValueChange={(v) => { if (v) diskWarningMode = v as 'percentage' | 'absolute'; }}>
				<Select.Trigger class="w-48">
					<div class="flex items-center gap-2">
						{#if diskWarningMode === 'percentage'}
							<Percent class="w-3.5 h-3.5" />
							<span>{$t('settings.environments.activity.thresholdPercentage')}</span>
						{:else}
							<HardDrive class="w-3.5 h-3.5" />
							<span>{$t('settings.environments.activity.thresholdAbsolute')}</span>
						{/if}
					</div>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="percentage">
						<div class="flex items-center gap-2">
							<Percent class="w-3.5 h-3.5" />
							{$t('settings.environments.activity.thresholdPercentage')}
						</div>
					</Select.Item>
					<Select.Item value="absolute">
						<div class="flex items-center gap-2">
							<HardDrive class="w-3.5 h-3.5" />
							{$t('settings.environments.activity.thresholdAbsolute')}
						</div>
					</Select.Item>
				</Select.Content>
			</Select.Root>

			{#if diskWarningMode === 'percentage'}
				<Input
					type="number"
					min={1}
					max={100}
					bind:value={diskWarningThreshold}
					class="w-24"
				/>
				<span class="text-sm text-muted-foreground">%</span>
			{:else}
				<Input
					type="number"
					min={1}
					bind:value={diskWarningThresholdGb}
					class="w-24"
				/>
				<span class="text-sm text-muted-foreground">GB</span>
			{/if}
		</div>
	{/if}
</div>
