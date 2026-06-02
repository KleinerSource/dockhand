<script lang="ts">
	import { CheckCircle2, ShieldAlert, XCircle, Search } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	interface Props {
		checked?: number;
		updated: number;
		blocked: number;
		failed: number;
		compact?: boolean;
	}

	let { checked, updated, blocked, failed, compact = false }: Props = $props();
</script>

{#if compact}
	<!-- Inline compact layout -->
	<div class="flex items-center gap-4 text-sm">
		{#if checked !== undefined}
			<div class="flex items-center gap-1.5">
				<span class="font-bold">{checked}</span>
				<span class="text-muted-foreground">{$t('updateSummary.checked')}</span>
			</div>
		{/if}
		{#if updated > 0}
			<div class="flex items-center gap-1.5 text-green-600">
				<CheckCircle2 class="w-4 h-4" />
				<span>{updated} {$t('updateSummary.updated')}</span>
			</div>
		{/if}
		{#if blocked > 0}
			<div class="flex items-center gap-1.5 text-amber-600">
				<ShieldAlert class="w-4 h-4" />
				<span>{blocked} {$t('updateSummary.blocked')}</span>
			</div>
		{/if}
		{#if failed > 0}
			<div class="flex items-center gap-1.5 text-red-600">
				<XCircle class="w-4 h-4" />
				<span>{failed} {$t('updateSummary.failed')}</span>
			</div>
		{/if}
	</div>
{:else}
	<!-- Grid layout -->
	<div class="flex items-center gap-4 text-sm pb-3 border-b">
		{#if checked !== undefined}
			<div class="flex items-center gap-1.5">
				<Search class="w-4 h-4 text-muted-foreground" />
				<span class="font-bold">{checked}</span>
				<span class="text-muted-foreground">{$t('updateSummary.checked')}</span>
			</div>
		{/if}
		<div class="flex items-center gap-1.5">
			<CheckCircle2 class="w-4 h-4 text-green-500" />
			<span class="font-bold text-green-500">{updated}</span>
			<span class="text-muted-foreground">{$t('updateSummary.updatedLabel')}</span>
		</div>
		<div class="flex items-center gap-1.5">
			<ShieldAlert class="w-4 h-4 text-amber-500" />
			<span class="font-bold text-amber-500">{blocked}</span>
			<span class="text-muted-foreground">{$t('updateSummary.blockedLabel')}</span>
		</div>
		<div class="flex items-center gap-1.5">
			<XCircle class="w-4 h-4 text-red-500" />
			<span class="font-bold text-red-500">{failed}</span>
			<span class="text-muted-foreground">{$t('updateSummary.failedLabel')}</span>
		</div>
	</div>
{/if}
