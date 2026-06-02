<script lang="ts">
	import { WifiOff } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	interface Props {
		error?: string;
		compact?: boolean;
	}

	let { error, compact = false }: Props = $props();
</script>

{#if compact}
	<div class="flex items-center gap-2 text-muted-foreground py-1">
		<WifiOff class="w-4 h-4 opacity-50" />
		<span class="text-xs">{$t('dashboard.statusTitles.offline')}</span>
	</div>
{:else}
	<div class="flex flex-col items-center justify-center py-8 text-muted-foreground">
		<WifiOff class="w-8 h-8 mb-2 opacity-50" />
		<span class="text-sm">{$t('dashboard.stats.environmentOffline')}</span>
		{#if error}
			<span class="text-xs mt-1 text-red-500/70">{error}</span>
		{/if}
	</div>
{/if}
