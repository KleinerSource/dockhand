<script lang="ts">
	import { Activity } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	interface Props {
		today: number;
		total: number;
	}

	let { today, total }: Props = $props();
</script>

{#if total > 0}
	<div class="flex items-center justify-between text-xs pt-1 border-t border-border/50">
		<span class="flex items-center gap-1 text-muted-foreground">
			<Activity class="w-3 h-3" /> {$t('dashboard.stats.events')}
		</span>
		<span class="font-medium">
			{$t('dashboard.stats.eventsTodayTotal', { today, total })}
		</span>
	</div>
{/if}
