<script lang="ts">
	import { Loader2 } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	interface Props {
		compact?: boolean;
	}

	let { compact = false }: Props = $props();
</script>

{#if compact}
	<div class="flex items-center gap-2 text-muted-foreground py-1">
		<Loader2 class="w-4 h-4 animate-spin opacity-50" />
		<span class="text-xs">{$t('dashboard.stats.connecting')}</span>
	</div>
{:else}
	<div class="flex flex-col items-center justify-center py-8 text-muted-foreground">
		<Loader2 class="w-8 h-8 mb-2 animate-spin opacity-50" />
		<span class="text-sm">{$t('dashboard.stats.connectingToEnvironment')}</span>
	</div>
{/if}
