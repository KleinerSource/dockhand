<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { TogglePill, ToggleSwitch } from '$lib/components/ui/toggle-pill';
	import CronEditor from '$lib/components/cron-editor.svelte';
	import TimezoneSelector from '$lib/components/TimezoneSelector.svelte';
	import { Eye, Bell, Database, Calendar, ShieldCheck, FileText, AlertTriangle, HelpCircle, Globe, Activity, Clock, Info, Save, RotateCcw, LayoutDashboard, Tags } from 'lucide-svelte';
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import { appSettings, type DateFormat, type DownloadFormat, type EventCollectionMode, type LabelFilterMode } from '$lib/stores/settings';
	import { t } from '$lib/i18n';
	import { canAccess, authStore } from '$lib/stores/auth';
	import { toast } from 'svelte-sonner';
	import ThemeSelector from '$lib/components/ThemeSelector.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';

	// General settings state - these derive from the store
	let confirmDestructive = $derived($appSettings.confirmDestructive);
	let showStoppedContainers = $derived($appSettings.showStoppedContainers);
	let highlightUpdates = $derived($appSettings.highlightUpdates);
	let compactPorts = $derived($appSettings.compactPorts);
	let showExposedPorts = $derived($appSettings.showExposedPorts);
	let timeFormat = $derived($appSettings.timeFormat);
	let dateFormat = $derived($appSettings.dateFormat);
	let downloadFormat = $derived($appSettings.downloadFormat);
	let defaultGrypeArgs = $derived($appSettings.defaultGrypeArgs);
	let defaultTrivyArgs = $derived($appSettings.defaultTrivyArgs);
	let defaultGrypeImage = $derived($appSettings.defaultGrypeImage);
	let defaultTrivyImage = $derived($appSettings.defaultTrivyImage);
	let defaultComposeTemplate = $derived($appSettings.defaultComposeTemplate);
	let labelFilterMode = $derived($appSettings.labelFilterMode);
	let composeTemplateWIP = $state('');
	let composeTemplateInitialized = false;

	$effect(() => {
		if (!composeTemplateInitialized && defaultComposeTemplate !== undefined) {
			composeTemplateWIP = defaultComposeTemplate;
			composeTemplateInitialized = true;
		}
	});

	const builtinComposeTemplate = `version: "3.8"

services:
  app:
    image: nginx:alpine
    ports:
      - "8080:80"
    environment:
      - APP_ENV=\${APP_ENV:-production}
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped

# Add more services as needed
# networks:
#   default:
#     driver: bridge
`;

	function saveComposeTemplate() {
		appSettings.setDefaultComposeTemplate(composeTemplateWIP);
		toast.success($t('settings.general.composeTemplateUpdated'));
	}

	function revertComposeTemplate() {
		composeTemplateWIP = builtinComposeTemplate;
		toast.info($t('settings.general.templateReverted'));
	}
	let scheduleRetentionDays = $derived($appSettings.scheduleRetentionDays);
	let eventRetentionDays = $derived($appSettings.eventRetentionDays);
	let scheduleCleanupCron = $derived($appSettings.scheduleCleanupCron);
	let eventCleanupCron = $derived($appSettings.eventCleanupCron);
	let scheduleCleanupEnabled = $derived($appSettings.scheduleCleanupEnabled);
	let eventCleanupEnabled = $derived($appSettings.eventCleanupEnabled);
	let scannerCleanupCron = $derived($appSettings.scannerCleanupCron);
	let scannerCleanupEnabled = $derived($appSettings.scannerCleanupEnabled);
	let logBufferSizeKb = $derived($appSettings.logBufferSizeKb);
	let formatLogTimestamps = $derived($appSettings.formatLogTimestamps);
	let defaultTimezone = $derived($appSettings.defaultTimezone);
	let eventCollectionMode = $derived($appSettings.eventCollectionMode);
	let eventPollInterval = $derived($appSettings.eventPollInterval);
	let metricsCollectionInterval = $derived($appSettings.metricsCollectionInterval);

	let clearingCache = $state(false);

	async function clearScannerCache() {
		clearingCache = true;
		try {
			const res = await fetch('/api/settings/scanner/cache', { method: 'DELETE' });
			const data = await res.json();
			if (res.ok && data.success) {
				const total = (data.removedVolumes?.length || 0) + (data.removedDirs?.length || 0);
				if (total > 0) {
					toast.success($t('settings.general.scannerCacheCleared', { count: total }));
				} else {
					toast.info($t('settings.general.scannerCacheEmpty'));
				}
			} else {
				toast.error(data.error || $t('settings.general.scannerCacheFailed'));
			}
		} catch {
			toast.error($t('settings.general.scannerCacheFailed'));
		} finally {
			clearingCache = false;
		}
	}

	const dateFormatOptions: { value: DateFormat; label: string; example: string }[] = [
		{ value: 'DD.MM.YYYY', label: 'DD.MM.YYYY', example: '31.12.2024' },
		{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
		{ value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
		{ value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' }
	];

	function handleScheduleRetentionChange(e: Event) {
		const value = Math.max(1, Math.min(365, parseInt((e.target as HTMLInputElement).value) || 30));
		appSettings.setScheduleRetentionDays(value);
		toast.success($t('settings.general.scheduleRetentionUpdated'));
	}

	function handleEventRetentionChange(e: Event) {
		const value = Math.max(1, Math.min(365, parseInt((e.target as HTMLInputElement).value) || 30));
		appSettings.setEventRetentionDays(value);
		toast.success($t('settings.general.eventRetentionUpdated'));
	}

	function handleScheduleCleanupCronChange(cron: string) {
		appSettings.setScheduleCleanupCron(cron);
		toast.success($t('settings.general.scheduleCleanupCronUpdated'));
	}

	function handleEventCleanupCronChange(cron: string) {
		appSettings.setEventCleanupCron(cron);
		toast.success($t('settings.general.eventCleanupCronUpdated'));
	}

	function handleScheduleCleanupEnabledChange() {
		const newState = !scheduleCleanupEnabled;
		appSettings.setScheduleCleanupEnabled(newState);
		toast.success(newState ? $t('settings.general.scheduleCleanupEnabled') : $t('settings.general.scheduleCleanupDisabled'));
	}

	function handleEventCleanupEnabledChange() {
		const newState = !eventCleanupEnabled;
		appSettings.setEventCleanupEnabled(newState);
		toast.success(newState ? $t('settings.general.eventCleanupEnabled') : $t('settings.general.eventCleanupDisabled'));
	}

	function handleScannerCleanupCronChange(cron: string) {
		appSettings.setScannerCleanupCron(cron);
		toast.success($t('settings.general.scannerCleanupCronUpdated'));
	}

	function handleScannerCleanupEnabledChange() {
		const newState = !scannerCleanupEnabled;
		appSettings.setScannerCleanupEnabled(newState);
		toast.success(newState ? $t('settings.general.scannerCleanupEnabled') : $t('settings.general.scannerCleanupDisabled'));
	}

	function handleGrypeImageBlur(e: Event) {
		const value = (e.target as HTMLInputElement).value.trim();
		if (value && value !== defaultGrypeImage) {
			appSettings.setDefaultGrypeImage(value);
			toast.success($t('settings.general.grypeImageUpdated'));
		}
	}

	function handleTrivyImageBlur(e: Event) {
		const value = (e.target as HTMLInputElement).value.trim();
		if (value && value !== defaultTrivyImage) {
			appSettings.setDefaultTrivyImage(value);
			toast.success($t('settings.general.trivyImageUpdated'));
		}
	}

	function handleGrypeArgsBlur(e: Event) {
		const value = (e.target as HTMLInputElement).value.trim();
		if (value !== defaultGrypeArgs) {
			appSettings.setDefaultGrypeArgs(value);
			toast.success($t('settings.general.grypeArgsUpdated'));
		}
	}

	function handleTrivyArgsBlur(e: Event) {
		const value = (e.target as HTMLInputElement).value.trim();
		if (value !== defaultTrivyArgs) {
			appSettings.setDefaultTrivyArgs(value);
			toast.success($t('settings.general.trivyArgsUpdated'));
		}
	}

	function handleLogBufferSizeChange(e: Event) {
		const value = Math.max(100, Math.min(5000, parseInt((e.target as HTMLInputElement).value) || 500));
		appSettings.setLogBufferSizeKb(value);
		toast.success($t('settings.general.logBufferSizeUpdated'));
	}

	function handleEventCollectionModeChange(value: string | undefined) {
		if (value === 'stream' || value === 'poll') {
			appSettings.setEventCollectionMode(value);
			toast.success($t('settings.general.eventCollectionModeUpdated', { mode: value }));
		}
	}

	function handleEventPollIntervalChange(selected: { value: number } | undefined) {
		if (selected?.value) {
			appSettings.setEventPollInterval(selected.value);
			toast.success($t('settings.general.eventPollIntervalUpdated', { seconds: selected.value / 1000 }));
		}
	}

	function handleMetricsIntervalChange(selected: { value: number } | undefined) {
		if (selected?.value) {
			appSettings.setMetricsCollectionInterval(selected.value);
			toast.success($t('settings.general.metricsIntervalUpdated', { seconds: selected.value / 1000 }));
		}
	}
</script>

<div class="flex-1 min-h-0 overflow-y-auto">
	<div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
		<!-- Left column -->
		<div class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<Eye class="w-4 h-4" />
						{$t('settings.general.appearance')}
						<Tooltip.Provider delayDuration={100}>
							<Tooltip.Root>
								<Tooltip.Trigger>
									<HelpCircle class="w-4 h-4 text-muted-foreground cursor-help" />
								</Tooltip.Trigger>
								<Tooltip.Portal>
									<Tooltip.Content side="right" sideOffset={8} class="!w-80">
										{#if $authStore.authEnabled}
											{$t('settings.general.appearanceAuthHint')}
										{:else}
											{$t('settings.general.appearanceGlobalHint')}
										{/if}
									</Tooltip.Content>
								</Tooltip.Portal>
							</Tooltip.Root>
						</Tooltip.Provider>
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
						<!-- Left column -->
						<div class="space-y-4">
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>{$t('settings.general.showStoppedContainers')}</Label>
									<TogglePill
										checked={showStoppedContainers}
										onchange={(checked) => {
											appSettings.setShowStoppedContainers(checked);
											toast.success(checked ? $t('settings.general.stoppedContainersShown') : $t('settings.general.stoppedContainersHidden'));
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">{$t('settings.general.showStoppedContainersDescription')}</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>{$t('settings.general.highlightUpdates')}</Label>
									<TogglePill
										checked={highlightUpdates}
										onchange={(checked) => {
											appSettings.setHighlightUpdates(checked);
											toast.success(checked ? $t('settings.general.updateHighlightingEnabled') : $t('settings.general.updateHighlightingDisabled'));
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">{$t('settings.general.highlightUpdatesDescription')}</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>{$t('settings.general.compactPortDisplay')}</Label>
									<TogglePill
										checked={compactPorts}
										onchange={(checked) => {
											appSettings.setCompactPorts(checked);
											toast.success(checked ? $t('settings.general.compactPortDisplayEnabled') : $t('settings.general.showingAllPorts'));
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">{$t('settings.general.compactPortDisplayDescription')}</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>{$t('settings.general.showExposedPorts')}</Label>
									<Tooltip.Root>
										<Tooltip.Trigger>
											<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
										</Tooltip.Trigger>
										<Tooltip.Content side="top" class="max-w-xs">
											<p>{$t('settings.general.showExposedPortsTooltip')}</p>
										</Tooltip.Content>
									</Tooltip.Root>
									<TogglePill
										checked={showExposedPorts}
										onchange={(checked) => {
											appSettings.setShowExposedPorts(checked);
											toast.success(checked ? $t('settings.general.showingExposedPorts') : $t('settings.general.exposedPortsHidden'));
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">{$t('settings.general.showExposedPortsDescription')}</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>{$t('settings.general.timeFormat')}</Label>
									<ToggleSwitch
										value={timeFormat}
										leftValue="24h"
										rightValue="12h"
										onchange={(newFormat) => {
											appSettings.setTimeFormat(newFormat as '12h' | '24h');
											toast.success($t('settings.general.timeFormatUpdated', { format: newFormat === '12h' ? $t('settings.general.time12h') : $t('settings.general.time24h') }));
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">{$t('settings.general.timeFormatDescription')}</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>{$t('settings.general.dateFormat')}</Label>
									<Select.Root
										type="single"
										value={dateFormat}
										onValueChange={(value) => {
											if (value) {
												appSettings.setDateFormat(value as DateFormat);
												toast.success($t('settings.general.dateFormatUpdated', { format: value }));
											}
										}}
										disabled={!$canAccess('settings', 'edit')}
									>
										<Select.Trigger class="w-[180px]">
											<Calendar class="w-4 h-4 mr-2" />
											<span>{dateFormat}</span>
										</Select.Trigger>
										<Select.Content>
											{#each dateFormatOptions as option}
												<Select.Item value={option.value}>
													<div class="flex items-center justify-between w-full gap-4">
														<span>{option.label}</span>
														<span class="text-xs text-muted-foreground">{option.example}</span>
													</div>
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
								<p class="text-xs text-muted-foreground">{$t('settings.general.dateFormatDescription')}</p>
							</div>
						</div>
						<!-- Right column: Theme settings (always shown, with hint when auth enabled) -->
						<div class="space-y-4">
							<ThemeSelector />
							{#if $authStore.authEnabled}
								<div class="text-xs text-muted-foreground flex items-start gap-1.5 mt-2 p-2 bg-muted/50 rounded-md">
									<HelpCircle class="w-3.5 h-3.5 shrink-0 mt-0.5" />
									<div>
										<p>{$t('settings.general.personalThemeHint')}</p>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<Globe class="w-4 h-4" />
						{$t('settings.general.scheduling')}
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label>{$t('settings.general.defaultTimezone')}</Label>
						<TimezoneSelector
							value={defaultTimezone}
							onchange={(value) => {
								appSettings.setDefaultTimezone(value);
								toast.success($t('settings.general.defaultTimezoneUpdated', { timezone: value }));
							}}
							class="w-[320px]"
						/>
						<p class="text-xs text-muted-foreground">{$t('settings.general.defaultTimezoneDescription')}</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<Bell class="w-4 h-4" />
						{$t('settings.general.confirmations')}
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-1">
						<div class="flex items-center gap-3">
							<Label>{$t('settings.general.confirmDestructiveActions')}</Label>
							<TogglePill
								checked={confirmDestructive}
								onchange={(checked) => {
									appSettings.setConfirmDestructive(checked);
									toast.success(checked ? $t('settings.general.confirmationsEnabled') : $t('settings.general.confirmationsDisabled'));
								}}
								disabled={!$canAccess('settings', 'edit')}
							/>
						</div>
						<p class="text-xs text-muted-foreground">{$t('settings.general.confirmDestructiveActionsDescription')}</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<FileText class="w-4 h-4" />
						{$t('settings.general.logsAndFiles')}
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
						<div class="space-y-4">
							<div class="space-y-2">
								<Label for="log-buffer-size">{$t('settings.general.logBufferSize')}</Label>
								<div class="flex items-center gap-2">
									<Input
										id="log-buffer-size"
										type="number"
										min="100"
										max="5000"
										value={logBufferSizeKb}
										onchange={handleLogBufferSizeChange}
										disabled={!$canAccess('settings', 'edit')}
										class="w-24"
									/>
									<span class="text-sm text-muted-foreground">KB</span>
								</div>
								<p class="text-xs text-muted-foreground">{$t('settings.general.logBufferSizeDescription')}</p>
								{#if logBufferSizeKb > 1000}
									<div class="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
										<AlertTriangle class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
										<p class="text-xs text-amber-600 dark:text-amber-400">{$t('settings.general.highLogBufferWarning')}</p>
									</div>
								{/if}
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>{$t('settings.general.downloadFormat')}</Label>
									<ToggleSwitch
										value={downloadFormat}
										leftValue="tar"
										rightValue="tar.gz"
										onchange={(newFormat) => {
											appSettings.setDownloadFormat(newFormat as DownloadFormat);
											toast.success($t('settings.general.downloadFormatUpdated', { format: newFormat }));
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">{$t('settings.general.downloadFormatDescription')}</p>
							</div>
						</div>
						<div class="space-y-4">
							<div class="space-y-1">
								<div class="flex items-center gap-3">
									<Label>{$t('settings.general.formatLogTimestamps')}</Label>
									<TogglePill
										checked={formatLogTimestamps}
										onchange={(checked) => {
											appSettings.setFormatLogTimestamps(checked);
											toast.success(checked ? $t('settings.general.logTimestampFormattingEnabled') : $t('settings.general.logTimestampFormattingDisabled'));
										}}
										disabled={!$canAccess('settings', 'edit')}
									/>
								</div>
								<p class="text-xs text-muted-foreground">{$t('settings.general.formatLogTimestampsDescription')}</p>
								<div class="flex items-start gap-1.5 mt-1">
									<Info class="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
									<p class="text-xs text-muted-foreground">
										{$t('settings.general.formatLogTimestampsHelp', { example: '2026-01-12T07:47:44Z' })}
									</p>
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<FileText class="w-4 h-4" />
						{$t('settings.general.composeTemplate')}
					</Card.Title>
					<p class="text-xs text-muted-foreground">{$t('settings.general.composeTemplateDescription')}</p>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="h-64">
						<CodeEditor
							value={composeTemplateWIP}
							onchange={(v) => { composeTemplateWIP = v; }}
							language="yaml"
							readonly={!$canAccess('settings', 'edit')}
							class="h-full rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700"
						/>
					</div>
					{#if $canAccess('settings', 'edit')}
						<div class="flex gap-2">
							<Button size="sm" variant="outline" onclick={saveComposeTemplate}>
								<Save class="w-3.5 h-3.5" />
								{$t('settings.general.saveTemplate')}
							</Button>
							<Button size="sm" variant="ghost" onclick={revertComposeTemplate}>
								<RotateCcw class="w-3.5 h-3.5" />
								{$t('settings.general.revertToDefault')}
							</Button>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

		</div>

		<!-- Right column -->
		<div class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<ShieldCheck class="w-4 h-4" />
						{$t('settings.general.vulnerabilityScanners')}
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="grype-image">{$t('settings.general.grypeImage')}</Label>
						<Input
							id="grype-image"
							value={defaultGrypeImage}
							onblur={handleGrypeImageBlur}
							disabled={!$canAccess('settings', 'edit')}
							placeholder={"anchore/grype:v0.110.0"}
						/>
						<p class="text-xs text-muted-foreground">{$t('settings.general.grypeImageDescription')}</p>
					</div>
					<div class="space-y-2">
						<Label for="trivy-image">{$t('settings.general.trivyImage')}</Label>
						<Input
							id="trivy-image"
							value={defaultTrivyImage}
							onblur={handleTrivyImageBlur}
							disabled={!$canAccess('settings', 'edit')}
							placeholder={"aquasec/trivy:0.69.3"}
						/>
						<p class="text-xs text-muted-foreground">{$t('settings.general.trivyImageDescription')}</p>
					</div>
					<div class="space-y-2">
						<Label for="grype-args">{$t('settings.general.defaultGrypeArguments')}</Label>
						<Input
							id="grype-args"
							value={defaultGrypeArgs}
							onblur={handleGrypeArgsBlur}
							disabled={!$canAccess('settings', 'edit')}
							placeholder={"-o json -v {image}"}
						/>
						<p class="text-xs text-muted-foreground">{$t('settings.general.imagePlaceholderHelp', { placeholder: '{image}' })}</p>
					</div>
					<div class="space-y-2">
						<Label for="trivy-args">{$t('settings.general.defaultTrivyArguments')}</Label>
						<Input
							id="trivy-args"
							value={defaultTrivyArgs}
							onblur={handleTrivyArgsBlur}
							disabled={!$canAccess('settings', 'edit')}
							placeholder={"image --format json {image}"}
						/>
						<p class="text-xs text-muted-foreground">{$t('settings.general.imagePlaceholderHelp', { placeholder: '{image}' })}</p>
					</div>
					<div class="pt-2 border-t">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium">{$t('settings.general.scannerCache')}</p>
								<p class="text-xs text-muted-foreground">{$t('settings.general.scannerCacheDescription')}</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								disabled={clearingCache || !$canAccess('settings', 'edit')}
								onclick={clearScannerCache}
							>
								{#if clearingCache}
									{$t('settings.general.clearing')}
								{:else}
									{$t('settings.general.clearCache')}
								{/if}
							</Button>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<Database class="w-4 h-4" />
						{$t('settings.general.systemJobs')}
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-3">
						<div>
							<div class="flex items-center gap-2">
								<Label>{$t('settings.general.activityEventCollectionMode')}</Label>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
									</Tooltip.Trigger>
									<Tooltip.Content class="w-80">
										<p class="text-xs">
											{$t('settings.general.activityEventCollectionModeTooltip')}
										</p>
									</Tooltip.Content>
								</Tooltip.Root>
							</div>
							<div class="flex items-center gap-4 mt-2">
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="eventCollectionMode"
										value="stream"
										checked={(eventCollectionMode || 'stream') === 'stream'}
										onchange={() => handleEventCollectionModeChange('stream')}
										disabled={!$canAccess('settings', 'edit')}
										class="accent-primary w-4 h-4"
									/>
									<Activity class="w-3.5 h-3.5" />
									<span class="text-sm">{$t('settings.general.stream')}</span>
								</label>
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="radio"
										name="eventCollectionMode"
										value="poll"
										checked={(eventCollectionMode || 'stream') === 'poll'}
										onchange={() => handleEventCollectionModeChange('poll')}
										disabled={!$canAccess('settings', 'edit')}
										class="accent-primary w-4 h-4"
									/>
									<Clock class="w-3.5 h-3.5" />
									<span class="text-sm">{$t('settings.general.poll')}</span>
								</label>

								<span class="text-xs text-muted-foreground {(eventCollectionMode || 'stream') === 'poll' ? '' : 'invisible'}">{$t('settings.general.every')}</span>
								<Select.Root
									type="single"
									value={String(eventPollInterval || 60000)}
									onValueChange={(v) => v && handleEventPollIntervalChange({ value: parseInt(v) })}
									disabled={!$canAccess('settings', 'edit') || (eventCollectionMode || 'stream') !== 'poll'}
								>
									<Select.Trigger class="w-24 h-8 {(eventCollectionMode || 'stream') === 'poll' ? '' : 'invisible'}">
										{(eventPollInterval || 60000) === 30000 ? '30s' : (eventPollInterval || 60000) === 60000 ? '60s' : (eventPollInterval || 60000) === 120000 ? '120s' : '300s'}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="30000">30s</Select.Item>
										<Select.Item value="60000">60s</Select.Item>
										<Select.Item value="120000">120s</Select.Item>
										<Select.Item value="300000">300s</Select.Item>
									</Select.Content>
								</Select.Root>
							</div>
						</div>
					</div>

					<div class="space-y-1 pt-2 border-t">
						<div class="flex items-center gap-2">
							<Label for="metrics-interval">{$t('settings.general.metricsCollectionInterval')}</Label>
							<Tooltip.Root>
								<Tooltip.Trigger>
									<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
								</Tooltip.Trigger>
								<Tooltip.Content class="w-80">
									<p class="text-xs">
										{$t('settings.general.metricsCollectionIntervalTooltip')}
									</p>
								</Tooltip.Content>
							</Tooltip.Root>
						</div>
						<div class="flex items-center gap-2 mt-2">
							<Select.Root
								type="single"
								value={String(metricsCollectionInterval || 30000)}
								onValueChange={(v) => v && handleMetricsIntervalChange({ value: parseInt(v) })}
								disabled={!$canAccess('settings', 'edit')}
							>
								<Select.Trigger class="w-24 h-8">
									{(metricsCollectionInterval || 30000) === 10000 ? '10s' : (metricsCollectionInterval || 30000) === 30000 ? '30s' : (metricsCollectionInterval || 30000) === 60000 ? '60s' : '120s'}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="10000">10s</Select.Item>
									<Select.Item value="30000">30s</Select.Item>
									<Select.Item value="60000">60s</Select.Item>
									<Select.Item value="120000">120s</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
					</div>

					<div class="space-y-1 pt-2 border-t">
						<div class="flex items-center gap-3">
							<Label for="schedule-retention">{$t('settings.general.scheduleExecutionCleanup')}</Label>
							<TogglePill
								checked={scheduleCleanupEnabled}
								onchange={handleScheduleCleanupEnabledChange}
								disabled={!$canAccess('settings', 'edit')}
							/>
						</div>
						<p class="text-xs text-muted-foreground">{$t('settings.general.scheduleExecutionCleanupDescription')}</p>
						<div class="flex items-center gap-2 mt-2">
							<Input
								id="schedule-retention"
								type="number"
								min="1"
								max="365"
								value={scheduleRetentionDays}
								onchange={handleScheduleRetentionChange}
								disabled={!$canAccess('settings', 'edit') || !scheduleCleanupEnabled}
								class="w-20"
							/>
							<span class="text-sm text-muted-foreground">{$t('settings.general.days')}</span>
							<div class="ml-auto">
								<CronEditor
									value={scheduleCleanupCron}
									onchange={handleScheduleCleanupCronChange}
									disabled={!$canAccess('settings', 'edit') || !scheduleCleanupEnabled}
								/>
							</div>
						</div>
					</div>
					<div class="space-y-1">
						<div class="flex items-center gap-3">
							<Label for="event-retention">{$t('settings.general.containerEventCleanup')}</Label>
							<TogglePill
								checked={eventCleanupEnabled}
								onchange={handleEventCleanupEnabledChange}
								disabled={!$canAccess('settings', 'edit')}
							/>
						</div>
						<p class="text-xs text-muted-foreground">{$t('settings.general.containerEventCleanupDescription')}</p>
						<div class="flex items-center gap-2 mt-2">
							<Input
								id="event-retention"
								type="number"
								min="1"
								max="365"
								value={eventRetentionDays}
								onchange={handleEventRetentionChange}
								disabled={!$canAccess('settings', 'edit') || !eventCleanupEnabled}
								class="w-20"
							/>
							<span class="text-sm text-muted-foreground">{$t('settings.general.days')}</span>
							<div class="ml-auto">
								<CronEditor
									value={eventCleanupCron}
									onchange={handleEventCleanupCronChange}
									disabled={!$canAccess('settings', 'edit') || !eventCleanupEnabled}
								/>
							</div>
						</div>
					</div>
					<div class="space-y-1 pt-2 border-t">
						<div class="flex items-center gap-3">
							<Label>{$t('settings.general.volumeHelperCleanup')}</Label>
							<Badge variant="secondary" class="text-xs">{$t('settings.general.alwaysEnabled')}</Badge>
						</div>
						<p class="text-xs text-muted-foreground">
							{$t('settings.general.volumeHelperCleanupDescription')}
						</p>
					</div>
					<div class="space-y-1 pt-2 border-t">
						<div class="flex items-center gap-3">
							<Label>{$t('settings.general.scannerCacheCleanup')}</Label>
							<TogglePill
								checked={scannerCleanupEnabled}
								onchange={handleScannerCleanupEnabledChange}
								disabled={!$canAccess('settings', 'edit')}
							/>
						</div>
						<p class="text-xs text-muted-foreground">{$t('settings.general.scannerCacheCleanupDescription')}</p>
						<div class="flex items-center gap-2 mt-2">
							<div class="ml-auto">
								<CronEditor
									value={scannerCleanupCron}
									onchange={handleScannerCleanupCronChange}
									disabled={!$canAccess('settings', 'edit') || !scannerCleanupEnabled}
								/>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<LayoutDashboard class="w-4 h-4" />
						{$t('settings.general.dashboard')}
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-3">
						<div class="space-y-1">
							<div class="flex items-center gap-3">
								<Label>{$t('settings.general.labelFilterMatching')}</Label>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<HelpCircle class="w-3.5 h-3.5 text-muted-foreground" />
									</Tooltip.Trigger>
									<Tooltip.Content class="w-80">
										<p class="text-xs">
											{$t('settings.general.labelFilterMatchingTooltip')}
										</p>
									</Tooltip.Content>
								</Tooltip.Root>
								<ToggleSwitch
									value={labelFilterMode}
									leftValue="any"
									rightValue="all"
									leftLabel={$t('settings.general.any')}
									rightLabel={$t('settings.general.all')}
									onchange={(mode) => appSettings.setLabelFilterMode(mode as LabelFilterMode)}
									disabled={!$canAccess('settings', 'edit')}
								/>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
