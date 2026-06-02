<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		LogIn,
		Plus,
		Pencil,
		Trash2,
		RefreshCw,
		Check,
		Pause,
		Play,
		Zap,
		XCircle
	} from 'lucide-svelte';
	import ConfirmPopover from '$lib/components/ConfirmPopover.svelte';
	import { canAccess } from '$lib/stores/auth';
	import { licenseStore } from '$lib/stores/license';
	import OidcModal from './OidcModal.svelte';
	import { EmptyState } from '$lib/components/ui/empty-state';
	import { t, translate } from '$lib/i18n';

	interface OidcConfig {
		id: number;
		name: string;
		enabled: boolean;
		issuerUrl: string;
		clientId: string;
		clientSecret: string;
		redirectUri: string;
		scopes: string;
		usernameClaim: string;
		emailClaim: string;
		displayNameClaim: string;
		adminClaim?: string;
		adminValue?: string;
		roleMappingsClaim?: string;
		roleMappings?: { claimValue: string; roleId: number }[];
	}

	interface Role {
		id: number;
		name: string;
		description?: string;
		isSystem: boolean;
		permissions: any;
		createdAt: string;
	}

	interface Props {
		roles: Role[];
	}

	let { roles }: Props = $props();

	// OIDC/SSO state
	let oidcConfigs = $state<OidcConfig[]>([]);
	let oidcLoading = $state(true);
	let showOidcModal = $state(false);
	let editingOidc = $state<OidcConfig | null>(null);
	let confirmDeleteOidcId = $state<number | null>(null);
	let oidcTesting = $state<number | null>(null);
	let oidcTestResult = $state<{ success: boolean; error?: string; issuer?: string; endpoints?: any } | null>(null);

	async function fetchOidcConfigs() {
		oidcLoading = true;
		try {
			const response = await fetch('/api/auth/oidc');
			if (response.ok) {
				oidcConfigs = await response.json();
			}
		} catch (error) {
			console.error('Failed to fetch OIDC configs:', error);
			toast.error(translate('settings.auth.oidc.list.toasts.loadFailed'));
		} finally {
			oidcLoading = false;
		}
	}

	function openOidcModal(config: OidcConfig | null) {
		editingOidc = config;
		showOidcModal = true;
	}

	function handleOidcModalClose() {
		showOidcModal = false;
		editingOidc = null;
	}

	async function handleOidcModalSaved() {
		showOidcModal = false;
		editingOidc = null;
		await fetchOidcConfigs();
	}

	async function deleteOidcConfig(configId: number) {
		try {
			const response = await fetch(`/api/auth/oidc/${configId}`, { method: 'DELETE' });
			if (response.ok) {
				await fetchOidcConfigs();
				toast.success(translate('settings.auth.oidc.list.toasts.deleted'));
			} else {
				toast.error(translate('settings.auth.oidc.list.toasts.deleteFailed'));
			}
		} catch (error) {
			console.error('Failed to delete OIDC config:', error);
			toast.error(translate('settings.auth.oidc.list.toasts.deleteFailed'));
		} finally {
			confirmDeleteOidcId = null;
		}
	}

	async function testOidcConnection(configId: number) {
		oidcTesting = configId;
		oidcTestResult = null;
		try {
			const response = await fetch(`/api/auth/oidc/${configId}/test`, { method: 'POST' });
			const data = await response.json();
			oidcTestResult = data;
			if (data.success) {
				toast.success(translate('settings.auth.oidc.list.toasts.connectionSuccessful'));
			} else {
				toast.error(translate('settings.auth.oidc.list.toasts.connectionFailedWithError', { error: data.error }));
			}
		} catch (error) {
			oidcTestResult = { success: false, error: translate('settings.auth.oidc.list.test.testFailed') };
			toast.error(translate('settings.auth.oidc.list.toasts.testFailed'));
		} finally {
			oidcTesting = null;
		}
	}

	async function toggleOidcEnabled(config: OidcConfig) {
		try {
			const response = await fetch(`/api/auth/oidc/${config.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...config, enabled: !config.enabled })
			});
			if (response.ok) {
				await fetchOidcConfigs();
				toast.success(translate(config.enabled ? 'settings.auth.oidc.list.toasts.disabled' : 'settings.auth.oidc.list.toasts.enabled'));
			} else {
				toast.error(translate('settings.auth.oidc.list.toasts.toggleFailed'));
			}
		} catch (error) {
			console.error('Failed to toggle OIDC config:', error);
			toast.error(translate('settings.auth.oidc.list.toasts.toggleFailed'));
		}
	}

	onMount(() => {
		fetchOidcConfigs();
	});
</script>

<div class="space-y-4">
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title class="text-sm font-medium flex items-center gap-2">
						<LogIn class="w-4 h-4" />
						{$t('settings.auth.oidc.list.title')}
					</Card.Title>
					<p class="text-xs text-muted-foreground mt-1">{$t('settings.auth.oidc.list.description')}</p>
				</div>
				{#if $canAccess('settings', 'edit')}
					<Button size="sm" onclick={() => openOidcModal(null)}>
						<Plus class="w-4 h-4" />
						{$t('settings.auth.oidc.list.addProvider')}
					</Button>
				{/if}
			</div>
		</Card.Header>
		<Card.Content>
			{#if oidcLoading}
				<div class="flex items-center justify-center py-4">
					<RefreshCw class="w-6 h-6 animate-spin text-muted-foreground" />
				</div>
			{:else if oidcConfigs.length === 0}
				<EmptyState
					icon={LogIn}
					title={$t('settings.auth.oidc.list.empty.title')}
					description={$t('settings.auth.oidc.list.empty.description')}
					class="py-8"
				/>
			{:else}
				<div class="space-y-2">
					{#each oidcConfigs as config}
						<div class="flex items-center justify-between p-3 border rounded-md">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<span class="font-medium text-sm">{config.name}</span>
									{#if config.enabled}
										<Badge variant="default" class="text-xs">{$t('settings.auth.oidc.list.status.enabled')}</Badge>
									{:else}
										<Badge variant="outline" class="text-xs">{$t('settings.auth.oidc.list.status.disabled')}</Badge>
									{/if}
								</div>
								<span class="text-xs text-muted-foreground truncate block">{config.issuerUrl}</span>
							</div>
							<div class="flex items-center gap-1">
								<Button
									variant="ghost"
									size="sm"
									title={$t('settings.auth.oidc.list.actions.testConnection')}
									onclick={() => testOidcConnection(config.id)}
									disabled={oidcTesting === config.id}
								>
									{#if oidcTesting === config.id}
										<RefreshCw class="w-4 h-4 animate-spin" />
									{:else}
										<Zap class="w-4 h-4" />
									{/if}
								</Button>
								{#if $canAccess('settings', 'edit')}
									<Button
										variant="ghost"
										size="sm"
										title={config.enabled ? $t('settings.auth.oidc.list.actions.disableProvider') : $t('settings.auth.oidc.list.actions.enableProvider')}
										onclick={() => toggleOidcEnabled(config)}
									>
										{#if config.enabled}
											<Pause class="w-4 h-4" />
										{:else}
											<Play class="w-4 h-4" />
										{/if}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										title={$t('settings.auth.oidc.list.actions.editProvider')}
										onclick={() => openOidcModal(config)}
									>
										<Pencil class="w-4 h-4" />
									</Button>
									<ConfirmPopover
										open={confirmDeleteOidcId === config.id}
										action={$t('settings.auth.oidc.list.confirm.deleteAction')}
										itemType={$t('settings.auth.oidc.list.confirm.provider')}
										itemName={config.name}
										title={$t('settings.auth.oidc.list.confirm.deleteTitle')}
										onConfirm={() => deleteOidcConfig(config.id)}
										onOpenChange={(open) => confirmDeleteOidcId = open ? config.id : null}
									>
										{#snippet children({ open })}
											<Trash2 class="w-4 h-4 {open ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}" />
										{/snippet}
									</ConfirmPopover>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			{#if oidcTestResult}
				<div class="mt-4 p-3 border rounded-md {oidcTestResult.success ? 'border-green-500 bg-green-500/10' : 'border-destructive bg-destructive/10'}">
					{#if oidcTestResult.success}
						<div class="flex items-center gap-2 text-green-600">
							<Check class="w-4 h-4" />
							<p class="text-sm font-medium">{$t('settings.auth.oidc.list.test.connectionSuccessful')}</p>
						</div>
						{#if oidcTestResult.issuer}
							<p class="text-xs text-muted-foreground mt-1">{$t('settings.auth.oidc.list.test.issuer', { issuer: oidcTestResult.issuer })}</p>
						{/if}
					{:else}
						<div class="flex items-center gap-2 text-destructive">
							<XCircle class="w-4 h-4" />
							<p class="text-sm">{$t('settings.auth.oidc.list.test.connectionFailed', { error: oidcTestResult.error })}</p>
						</div>
					{/if}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<OidcModal
	bind:open={showOidcModal}
	oidc={editingOidc}
	{roles}
	isEnterprise={$licenseStore.isEnterprise}
	onClose={handleOidcModalClose}
	onSaved={handleOidcModalSaved}
/>
