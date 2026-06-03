<script lang="ts">
	import { Globe } from 'lucide-svelte';
	import * as Select from '$lib/components/ui/select';
	import { appSettings } from '$lib/stores/settings';
	import { authStore, canAccess } from '$lib/stores/auth';
	import { locale, localeOptions, t, type Locale } from '$lib/i18n';

	let {
		class: className = '',
		persistToSettings = true
	}: {
		class?: string;
		persistToSettings?: boolean;
	} = $props();

	const currentLocale = $derived($locale);
	const currentOption = $derived(localeOptions.find((option) => option.value === currentLocale) ?? localeOptions[0]);
	const canPersist = $derived(persistToSettings && (!$authStore.authEnabled || $canAccess('settings', 'edit')));

	function getShortLabel(value: Locale): string {
		return value === 'zh-CN' ? 'ZH' : 'EN';
	}

	function handleLanguageChange(value: string | undefined) {
		if (value !== 'en' && value !== 'zh-CN') return;

		const nextLocale = value as Locale;
		if (canPersist) {
			appSettings.setLanguage(nextLocale);
		} else {
			locale.set(nextLocale);
		}
	}
</script>

<Select.Root type="single" value={currentLocale} onValueChange={handleLanguageChange}>
	<Select.Trigger
		size="sm"
		class="h-9 min-w-16 px-2.5 gap-1.5 {className}"
		title={$t('language.label')}
		aria-label={$t('language.label')}
	>
		<Globe class="w-4 h-4" />
		<span class="text-xs font-medium">{getShortLabel(currentOption.value)}</span>
	</Select.Trigger>
	<Select.Content>
		{#each localeOptions as option}
			<Select.Item value={option.value}>
				{$t(option.labelKey)}
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
