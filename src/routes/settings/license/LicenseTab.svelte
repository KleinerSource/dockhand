<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Crown, Building2, Key, RefreshCw, ShieldCheck, XCircle } from 'lucide-svelte';
	import { canAccess } from '$lib/stores/auth';
	import { licenseStore } from '$lib/stores/license';
	import { formatDate } from '$lib/stores/settings';
	import { t, translate } from '$lib/i18n';

	// License state
	interface LicenseInfo {
		valid: boolean;
		active: boolean;
		hostname?: string;
		payload?: {
			name: string;
			host: string;
			issued: string;
			expires: string | null;
			type: string;
		};
		stored?: {
			name: string;
			key: string;
			activated_at: string;
		};
		error?: string;
	}

	let licenseInfo = $state<LicenseInfo | null>(null);
	let licenseLoading = $state(true);
	let licenseFormName = $state('');
	let licenseFormKey = $state('');
	let licenseFormError = $state('');
	let licenseFormSaving = $state(false);

	function getLicenseErrorMessage(error?: string | null): string {
		if (!error) return '';
		if (error === 'Invalid license format') return translate('settings.license.errors.invalidFormat');
		if (error === 'Invalid license signature') return translate('settings.license.errors.invalidSignature');
		if (error === 'License has expired') return translate('settings.license.errors.expired');
		if (error === 'Name and key are required') return translate('settings.license.validation.nameKeyRequired');
		if (error === 'Failed to get license status') return translate('settings.license.errors.fetchFailed');
		if (error === 'Failed to activate license') return translate('settings.license.errors.activateFailed');
		if (error === 'Permission denied') return translate('settings.license.errors.permissionDenied');
		if (error === 'Authentication required') return translate('settings.license.errors.authenticationRequired');

		const hostMatch = error.match(/^License is not valid for this host \((.+)\)$/);
		if (hostMatch) {
			return translate('settings.license.errors.hostMismatch', { host: hostMatch[1] });
		}

		const nameMatch = error.match(/^License name mismatch\. Expected "(.+)", got "(.+)"$/);
		if (nameMatch) {
			return translate('settings.license.errors.nameMismatch', {
				expected: nameMatch[1],
				actual: nameMatch[2]
			});
		}

		const validationMatch = error.match(/^License validation failed: (.+)$/);
		if (validationMatch) {
			return translate('settings.license.errors.validationFailed', { error: validationMatch[1] });
		}

		return error;
	}

	async function fetchLicenseInfo() {
		licenseLoading = true;
		try {
			const response = await fetch('/api/license');
			const result = await response.json();
			licenseInfo = {
				...result,
				error: getLicenseErrorMessage(result.error)
			};
		} catch (error) {
			console.error('Failed to fetch license info:', error);
			licenseInfo = { valid: false, active: false, error: translate('settings.license.errors.fetchFailed') };
		} finally {
			licenseLoading = false;
		}
	}

	async function activateLicense() {
		if (!licenseFormName.trim() || !licenseFormKey.trim()) {
			licenseFormError = translate('settings.license.validation.nameKeyRequired');
			return;
		}

		licenseFormSaving = true;
		licenseFormError = '';

		try {
			const response = await fetch('/api/license', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: licenseFormName.trim(),
					key: licenseFormKey.trim()
				})
			});

			const result = await response.json();

			if (!response.ok || result.error) {
				licenseFormError = getLicenseErrorMessage(result.error) || translate('settings.license.errors.activateFailed');
				return;
			}

			// Refresh license info and update global store
			await fetchLicenseInfo();
			await licenseStore.check();
			toast.success(translate('settings.license.toasts.activated'));

			// Clear form
			licenseFormName = '';
			licenseFormKey = '';
		} catch (error) {
			licenseFormError = translate('settings.license.errors.activateFailed');
			toast.error(translate('settings.license.errors.activateFailed'));
		} finally {
			licenseFormSaving = false;
		}
	}

	async function deactivateLicense() {
		try {
			await fetch('/api/license', { method: 'DELETE' });
			await fetchLicenseInfo();
			await licenseStore.check();
			toast.success(translate('settings.license.toasts.deactivated'));
		} catch (error) {
			console.error('Failed to deactivate license:', error);
			toast.error(translate('settings.license.errors.deactivateFailed'));
		}
	}

	onMount(() => {
		fetchLicenseInfo();
	});
</script>

<div class="space-y-4">
	<Card.Root class="border-dashed">
		<Card.Content class="pt-4">
			<div class="flex items-start gap-3">
				<Crown class="w-5 h-5 text-amber-500 mt-0.5" />
				<div>
					<p class="text-sm font-medium">{$t('settings.license.management')}</p>
					<p class="text-xs text-muted-foreground">
						{$t('settings.license.managementDescriptionBefore')} <span class="font-medium">Enterprise</span> {$t('settings.license.managementDescriptionAfter')}
					</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	{#if licenseLoading}
		<Card.Root>
			<Card.Content class="py-8 text-center">
				<RefreshCw class="w-6 h-6 mx-auto mb-2 animate-spin text-muted-foreground" />
				<p class="text-sm text-muted-foreground">{$t('settings.license.loading')}</p>
			</Card.Content>
		</Card.Root>
	{:else if licenseInfo?.valid && licenseInfo?.active}
		<!-- Active License Display -->
		{@const isEnterprise = licenseInfo.payload?.type === 'enterprise'}
		<Card.Root class={isEnterprise ? 'border-amber-500/50 bg-amber-500/5' : 'border-blue-500/50 bg-blue-500/5'}>
			<Card.Header>
				<Card.Title class="text-sm font-medium flex items-center gap-2">
					{#if isEnterprise}
						<Crown class="w-4 h-4 text-amber-500" />
						{$t('settings.license.activeEnterprise')}
					{:else}
						<Building2 class="w-4 h-4 text-blue-500" />
						{$t('settings.license.activeSmb')}
					{/if}
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<p class="text-muted-foreground">{$t('settings.license.licensedTo')}</p>
						<p class="font-medium">{licenseInfo.payload?.name}</p>
					</div>
					<div>
						<p class="text-muted-foreground">{$t('settings.license.licenseType')}</p>
						<p class="font-medium flex items-center gap-1">
							{#if isEnterprise}
								<Crown class="w-3.5 h-3.5 text-amber-500" />
								<span class="text-amber-600 dark:text-amber-400">Enterprise</span>
							{:else}
								<Building2 class="w-3.5 h-3.5 text-blue-500" />
								<span class="text-blue-600 dark:text-blue-400">SMB</span>
							{/if}
						</p>
					</div>
					<div>
						<p class="text-muted-foreground">{$t('settings.license.licensedHost')}</p>
						<p class="font-medium font-mono text-xs">{licenseInfo.payload?.host}</p>
					</div>
					<div>
						<p class="text-muted-foreground">{$t('settings.license.issued')}</p>
						<p class="font-medium">{formatDate(licenseInfo.payload?.issued || '')}</p>
					</div>
					<div>
						<p class="text-muted-foreground">{$t('settings.license.expires')}</p>
						<p class="font-medium">{licenseInfo.payload?.expires ? formatDate(licenseInfo.payload.expires) : $t('settings.license.neverPerpetual')}</p>
					</div>
				</div>
				<div class="pt-2 border-t">
					<p class="text-xs text-muted-foreground mb-2">{$t('settings.license.currentHostname')}</p>
					<code class="text-xs bg-muted px-2 py-1 rounded">{licenseInfo.hostname}</code>
				</div>
				{#if $canAccess('settings', 'edit')}
				<div class="flex justify-end">
					<Button variant="outline" size="sm" onclick={deactivateLicense}>
						<XCircle class="w-4 h-4" />
						{$t('settings.license.deactivate')}
					</Button>
				</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- License Activation Form -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm font-medium flex items-center gap-2">
					<Key class="w-4 h-4" />
					{$t('settings.license.activate')}
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if licenseFormError}
					<div class="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded p-2">
						{licenseFormError}
					</div>
				{/if}

				{#if licenseInfo?.error && !licenseFormError}
					<div class="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 rounded p-2">
						{getLicenseErrorMessage(licenseInfo.error)}
					</div>
				{/if}

				<div class="space-y-2">
					<Label for="license-name">{$t('settings.license.licenseName')}</Label>
					<Input
						id="license-name"
						bind:value={licenseFormName}
						placeholder={$t('settings.license.licenseNamePlaceholder')}
						disabled={!$canAccess('settings', 'edit')}
					/>
					<p class="text-xs text-muted-foreground">{$t('settings.license.licenseNameHelp')}</p>
				</div>

				<div class="space-y-2">
					<Label for="license-key">{$t('settings.license.licenseKey')}</Label>
					<textarea
						id="license-key"
						bind:value={licenseFormKey}
						placeholder={$t('settings.license.licenseKeyPlaceholder')}
						class="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
						disabled={!$canAccess('settings', 'edit')}
					></textarea>
				</div>

				<div class="pt-2 border-t">
					<p class="text-xs text-muted-foreground mb-2">{$t('settings.license.currentHostnameValidation')}</p>
					<code class="text-xs bg-muted px-2 py-1 rounded">{licenseInfo?.hostname || $t('common.states.unknown')}</code>
				</div>

				{#if $canAccess('settings', 'edit')}
				<div class="flex justify-end">
					<Button onclick={activateLicense} disabled={licenseFormSaving}>
						{#if licenseFormSaving}
							<RefreshCw class="w-4 h-4 mr-1 animate-spin" />
						{:else}
							<ShieldCheck class="w-4 h-4" />
						{/if}
						{$t('settings.license.activate')}
					</Button>
				</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
