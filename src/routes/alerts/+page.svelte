<script lang="ts">
	import { Bell } from 'lucide-svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { t } from '$lib/i18n';
</script>

<div class="flex flex-col gap-6 p-6">
	<PageHeader icon={Bell} title={$t('alerts.title')} />

	<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
		<Bell class="h-12 w-12 mb-4 opacity-50" />
		<p class="text-lg">{$t('alerts.empty')}</p>
		<p class="text-sm">{$t('alerts.comingSoon')}</p>
	</div>
</div>
