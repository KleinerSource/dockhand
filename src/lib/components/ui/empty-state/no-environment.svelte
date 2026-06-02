<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { EmptyState } from '$lib/components/ui/empty-state';
	import { Server, Settings } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { environments } from '$lib/stores/environment';
	import { t } from '$lib/i18n';

	const hasEnvironments = $derived($environments.length > 0);
</script>

{#if hasEnvironments}
	<EmptyState
		icon={Server}
		title={$t('ui.emptyState.noEnvironment.selectedTitle')}
		description={$t('ui.emptyState.noEnvironment.selectedDescription')}
	/>
{:else}
	<EmptyState
		icon={Server}
		title={$t('ui.emptyState.noEnvironment.configuredTitle')}
		description={$t('ui.emptyState.noEnvironment.configuredDescription')}
	>
		<Button variant="secondary" onclick={() => goto('/settings?tab=environments')}>
			<Settings class="w-4 h-4" />
			{$t('ui.emptyState.noEnvironment.goToSettings')}
		</Button>
	</EmptyState>
{/if}
