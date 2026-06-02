<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { LogIn, Pencil, Plus, Check, RefreshCw, Crown, Key, Shield, Trash2, TriangleAlert } from 'lucide-svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { focusFirstInput } from '$lib/utils';
	import { t, translate } from '$lib/i18n';

	export interface OidcConfig {
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

	export interface Role {
		id: number;
		name: string;
		description?: string;
		isSystem: boolean;
		permissions: any;
		createdAt: string;
	}

	interface Props {
		open: boolean;
		oidc?: OidcConfig | null;
		roles: Role[];
		isEnterprise: boolean;
		onClose: () => void;
		onSaved: () => void;
		onNavigateToLicense?: () => void;
	}

	let { open = $bindable(), oidc = null, roles, isEnterprise, onClose, onSaved, onNavigateToLicense }: Props = $props();

	const isEditing = $derived(oidc !== null);

	// Form state
	let formName = $state('');
	let formEnabled = $state(false);
	let formIssuerUrl = $state('');
	let formClientId = $state('');
	let formClientSecret = $state('');
	let formRedirectUri = $state('');
	let formScopes = $state('openid profile email');
	let formUsernameClaim = $state('preferred_username');
	let formEmailClaim = $state('email');
	let formDisplayNameClaim = $state('name');
	let formAdminClaim = $state('');
	let formAdminValue = $state('');
	let formRoleMappingsClaim = $state('groups');
	let formRoleMappings = $state<{ claim_value: string; role_id: number }[]>([]);
	let formActiveTab = $state('general');
	let formError = $state('');
	let formErrors = $state<{ name?: string; issuerUrl?: string; clientId?: string; clientSecret?: string; redirectUri?: string }>({});
	let formSaving = $state(false);

	function resetForm() {
		formName = '';
		formEnabled = false;
		formIssuerUrl = '';
		formClientId = '';
		formClientSecret = '';
		formRedirectUri = typeof window !== 'undefined' ? `${window.location.origin}/api/auth/oidc/callback` : '';
		formScopes = 'openid profile email';
		formUsernameClaim = 'preferred_username';
		formEmailClaim = 'email';
		formDisplayNameClaim = 'name';
		formAdminClaim = '';
		formAdminValue = '';
		formRoleMappingsClaim = 'groups';
		formRoleMappings = [];
		formActiveTab = 'general';
		formError = '';
		formErrors = {};
		formSaving = false;
	}

	// Initialize form when oidc changes or modal opens
	$effect(() => {
		if (open) {
			if (oidc) {
				formName = oidc.name;
				formEnabled = oidc.enabled;
				formIssuerUrl = oidc.issuerUrl;
				formClientId = oidc.clientId;
				formClientSecret = oidc.clientSecret;
				formRedirectUri = oidc.redirectUri;
				formScopes = oidc.scopes || 'openid profile email';
				formUsernameClaim = oidc.usernameClaim || 'preferred_username';
				formEmailClaim = oidc.emailClaim || 'email';
				formDisplayNameClaim = oidc.displayNameClaim || 'name';
				formAdminClaim = oidc.adminClaim || '';
				formAdminValue = oidc.adminValue || '';
				formRoleMappingsClaim = oidc.roleMappingsClaim || 'groups';
				formRoleMappings = oidc.roleMappings ? oidc.roleMappings.map(m => ({ claim_value: m.claimValue, role_id: m.roleId })) : [];
				formActiveTab = 'general';
				formError = '';
				formErrors = {};
				formSaving = false;
			} else {
				resetForm();
			}
		}
	});

	async function save() {
		formErrors = {};
		let hasErrors = false;

		if (!formName.trim()) {
			formErrors.name = translate('settings.auth.oidc.modal.validation.nameRequired');
			hasErrors = true;
		}
		if (!formIssuerUrl.trim()) {
			formErrors.issuerUrl = translate('settings.auth.oidc.modal.validation.issuerUrlRequired');
			hasErrors = true;
		}
		if (!formClientId.trim()) {
			formErrors.clientId = translate('settings.auth.oidc.modal.validation.clientIdRequired');
			hasErrors = true;
		}
		if (!isEditing && !formClientSecret.trim()) {
			formErrors.clientSecret = translate('settings.auth.oidc.modal.validation.clientSecretRequired');
			hasErrors = true;
		}
		if (!formRedirectUri.trim()) {
			formErrors.redirectUri = translate('settings.auth.oidc.modal.validation.redirectUriRequired');
			hasErrors = true;
		}

		if (hasErrors) return;

		formSaving = true;
		formError = '';

		try {
			const url = isEditing ? `/api/auth/oidc/${oidc!.id}` : '/api/auth/oidc';
			const method = isEditing ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: formName.trim(),
					enabled: formEnabled,
					issuerUrl: formIssuerUrl.trim(),
					clientId: formClientId.trim(),
					clientSecret: formClientSecret.trim(),
					redirectUri: formRedirectUri.trim(),
					scopes: formScopes.trim() || 'openid profile email',
					usernameClaim: formUsernameClaim.trim() || 'preferred_username',
					emailClaim: formEmailClaim.trim() || 'email',
					displayNameClaim: formDisplayNameClaim.trim() || 'name',
					adminClaim: formAdminClaim.trim() || undefined,
					adminValue: formAdminValue.trim() || undefined,
					roleMappings: formRoleMappings.length > 0 ? formRoleMappings.map(m => ({ claimValue: m.claim_value, roleId: m.role_id })) : undefined
				})
			});

			if (response.ok) {
				open = false;
				onSaved();
			} else {
				const data = await response.json();
				formError = data.error || translate(isEditing ? 'settings.auth.oidc.modal.errors.updateFailed' : 'settings.auth.oidc.modal.errors.createFailed');
			}
		} catch {
			formError = translate(isEditing ? 'settings.auth.oidc.modal.errors.updateFailed' : 'settings.auth.oidc.modal.errors.createFailed');
		} finally {
			formSaving = false;
		}
	}

	function handleClose() {
		open = false;
		onClose();
	}

	function addRoleMapping() {
		formRoleMappings = [...formRoleMappings, { claim_value: '', role_id: 0 }];
	}

	function removeRoleMapping(index: number) {
		formRoleMappings = formRoleMappings.filter((_, i) => i !== index);
	}

	function updateRoleMappingRole(index: number, roleId: number) {
		formRoleMappings[index].role_id = roleId;
		formRoleMappings = [...formRoleMappings];
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => { if (o) { formError = ''; formErrors = {}; focusFirstInput(); } }}>
	<Dialog.Content class="max-w-2xl h-[80vh] flex flex-col overflow-hidden">
		<Dialog.Header class="flex-shrink-0">
			<Dialog.Title class="flex items-center gap-2">
				{#if isEditing}
					<Pencil class="w-5 h-5" />
					{$t('settings.auth.oidc.modal.titleEdit')}
				{:else}
					<LogIn class="w-5 h-5" />
					{$t('settings.auth.oidc.modal.titleAdd')}
				{/if}
			</Dialog.Title>
		</Dialog.Header>

		<Tabs.Root bind:value={formActiveTab} class="flex-1 flex flex-col overflow-hidden">
			<Tabs.List class="flex-shrink-0 grid w-full grid-cols-2">
				<Tabs.Trigger value="general">{$t('settings.auth.oidc.modal.tabs.general')}</Tabs.Trigger>
				<Tabs.Trigger value="role-mapping" class="flex items-center gap-1.5">
					<Crown class="w-3.5 h-3.5 text-amber-500" />
					{$t('settings.auth.oidc.modal.tabs.roleMapping')}
				</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="general" class="flex-1 overflow-y-auto space-y-4 py-2 mt-0">
				{#if formError}
					<Alert.Root variant="destructive">
						<TriangleAlert class="h-4 w-4" />
						<Alert.Description>{formError}</Alert.Description>
					</Alert.Root>
				{/if}

				<!-- Basic Settings -->
				<div class="space-y-4">
					<h4 class="text-sm font-medium text-muted-foreground">{$t('settings.auth.oidc.modal.basicSettings')}</h4>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label>{$t('settings.auth.oidc.modal.name')} <span class="text-destructive">*</span></Label>
							<Input
								bind:value={formName}
								placeholder={$t('settings.auth.oidc.modal.namePlaceholder')}
								class={formErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
								oninput={() => formErrors.name = undefined}
							/>
							{#if formErrors.name}
								<p class="text-xs text-destructive">{formErrors.name}</p>
							{/if}
						</div>
						<div class="space-y-2">
							<Label>{$t('settings.auth.oidc.modal.issuerUrl')} <span class="text-destructive">*</span></Label>
							<Input
								bind:value={formIssuerUrl}
								placeholder="https://example.okta.com"
								class={formErrors.issuerUrl ? 'border-destructive focus-visible:ring-destructive' : ''}
								oninput={() => formErrors.issuerUrl = undefined}
							/>
							{#if formErrors.issuerUrl}
								<p class="text-xs text-destructive">{formErrors.issuerUrl}</p>
							{/if}
						</div>
					</div>
					<div class="flex items-center gap-2">
						<Checkbox
							checked={formEnabled}
							onCheckedChange={(checked) => formEnabled = checked === true}
						/>
						<Label class="text-sm font-normal cursor-pointer" onclick={() => formEnabled = !formEnabled}>
							{$t('settings.auth.oidc.modal.enableProvider')}
						</Label>
					</div>
				</div>

				<!-- Client Credentials -->
				<div class="space-y-4">
					<h4 class="text-sm font-medium text-muted-foreground">{$t('settings.auth.oidc.modal.clientCredentials')}</h4>
					<p class="text-xs text-muted-foreground">{$t('settings.auth.oidc.modal.clientCredentialsDescription')}</p>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label>{$t('settings.auth.oidc.modal.clientId')} <span class="text-destructive">*</span></Label>
							<Input
								bind:value={formClientId}
								placeholder="your-client-id"
								class={formErrors.clientId ? 'border-destructive focus-visible:ring-destructive' : ''}
								oninput={() => formErrors.clientId = undefined}
							/>
							{#if formErrors.clientId}
								<p class="text-xs text-destructive">{formErrors.clientId}</p>
							{/if}
						</div>
						<div class="space-y-2">
							<Label>{$t('settings.auth.oidc.modal.clientSecret')} {#if !isEditing}<span class="text-destructive">*</span>{/if}</Label>
							<Input
								type="password"
								bind:value={formClientSecret}
								placeholder={isEditing ? $t('settings.auth.oidc.modal.keepExistingSecret') : $t('settings.auth.oidc.modal.clientSecretPlaceholder')}
								class={formErrors.clientSecret ? 'border-destructive focus-visible:ring-destructive' : ''}
								oninput={() => formErrors.clientSecret = undefined}
							/>
							{#if formErrors.clientSecret}
								<p class="text-xs text-destructive">{formErrors.clientSecret}</p>
							{/if}
						</div>
					</div>
				</div>

				<!-- Redirect & Scopes -->
				<div class="space-y-4">
					<h4 class="text-sm font-medium text-muted-foreground">{$t('settings.auth.oidc.modal.redirectSettings')}</h4>
					<div class="space-y-2">
						<Label>{$t('settings.auth.oidc.modal.redirectUri')} <span class="text-destructive">*</span></Label>
						<Input
							bind:value={formRedirectUri}
							placeholder="https://dockhand.example.com/api/auth/oidc/callback"
							class={formErrors.redirectUri ? 'border-destructive focus-visible:ring-destructive' : ''}
							oninput={() => formErrors.redirectUri = undefined}
						/>
						{#if formErrors.redirectUri}
							<p class="text-xs text-destructive">{formErrors.redirectUri}</p>
						{:else}
							<p class="text-xs text-muted-foreground">{$t('settings.auth.oidc.modal.redirectUriHelp')}</p>
						{/if}
					</div>
					<div class="space-y-2">
						<Label>{$t('settings.auth.oidc.modal.scopes')}</Label>
						<Input
							bind:value={formScopes}
							placeholder="openid profile email"
						/>
					</div>
				</div>

				<!-- Claim Mapping -->
				<div class="space-y-4">
					<h4 class="text-sm font-medium text-muted-foreground">{$t('settings.auth.oidc.modal.claimMapping')}</h4>
					<p class="text-xs text-muted-foreground">{$t('settings.auth.oidc.modal.claimMappingDescription')}</p>
					<div class="grid grid-cols-3 gap-4">
						<div class="space-y-2">
							<Label>{$t('settings.auth.oidc.modal.usernameClaim')}</Label>
							<Input
								bind:value={formUsernameClaim}
								placeholder="preferred_username"
							/>
						</div>
						<div class="space-y-2">
							<Label>{$t('settings.auth.oidc.modal.emailClaim')}</Label>
							<Input
								bind:value={formEmailClaim}
								placeholder="email"
							/>
						</div>
						<div class="space-y-2">
							<Label>{$t('settings.auth.oidc.modal.displayNameClaim')}</Label>
							<Input
								bind:value={formDisplayNameClaim}
								placeholder="name"
							/>
						</div>
					</div>
				</div>
			</Tabs.Content>

			<Tabs.Content value="role-mapping" class="flex-1 overflow-y-auto space-y-4 py-2 mt-0">
				{#if !isEnterprise}
					<!-- Enterprise Feature Notice (no license) -->
					<div class="flex-1 flex items-center justify-center py-8">
						<div class="text-center">
							<h3 class="text-lg font-medium mb-2 flex items-center justify-center gap-2">
								<Crown class="w-5 h-5 text-amber-500" />
								{$t('settings.auth.oidc.modal.enterpriseFeature')}
							</h3>
							<p class="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
								{$t('settings.auth.oidc.modal.enterpriseFeatureDescription')}
							</p>
							{#if onNavigateToLicense}
								<Button onclick={() => { open = false; onNavigateToLicense?.(); }}>
									<Key class="w-4 h-4" />
									{$t('settings.auth.oidc.modal.activateLicense')}
								</Button>
							{/if}
						</div>
					</div>
				{:else}
					<!-- Admin Mapping (Simple) -->
					<div class="space-y-4">
						<h4 class="text-sm font-medium text-muted-foreground">{$t('settings.auth.oidc.modal.groupsRolesClaim')}</h4>
						<p class="text-xs text-muted-foreground">{$t('settings.auth.oidc.modal.groupsRolesClaimDescription')}</p>
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label>{$t('settings.auth.oidc.modal.claimName')}</Label>
								<Input
									bind:value={formAdminClaim}
									placeholder={$t('settings.auth.oidc.modal.groupsRolesClaimPlaceholder')}
								/>
								<p class="text-xs text-muted-foreground">{$t('settings.auth.oidc.modal.claimNameHelp')}</p>
							</div>
							<div class="space-y-2">
								<Label>{$t('settings.auth.oidc.modal.adminValues')}</Label>
								<Input
									bind:value={formAdminValue}
									placeholder={$t('settings.auth.oidc.modal.adminValuesPlaceholder')}
								/>
								<p class="text-xs text-muted-foreground">{$t('settings.auth.oidc.modal.adminValuesHelp')}</p>
							</div>
						</div>
					</div>

					<!-- Role Mappings Grid -->
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<h4 class="text-sm font-medium text-muted-foreground">{$t('settings.auth.oidc.modal.claimRoleMappings')}</h4>
								<p class="text-xs text-muted-foreground mt-0.5">{$t('settings.auth.oidc.modal.claimRoleMappingsDescription')}</p>
							</div>
							<Button
								size="sm"
								variant="outline"
								onclick={addRoleMapping}
							>
								<Plus class="w-4 h-4" />
								{$t('settings.auth.oidc.modal.addMapping')}
							</Button>
						</div>

						{#if formRoleMappings.length === 0}
							<div class="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
								{$t('settings.auth.oidc.modal.noRoleMappings')}
							</div>
						{:else}
							<div class="space-y-2">
								{#each formRoleMappings as mapping, index}
									<div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
										<div class="flex-1 grid grid-cols-2 gap-3">
											<div class="space-y-1">
												<Label class="text-xs">{$t('settings.auth.oidc.modal.claimValue')}</Label>
												<Input
													bind:value={mapping.claim_value}
													placeholder={$t('settings.auth.oidc.modal.claimValuePlaceholder')}
													class="h-8"
												/>
											</div>
											<div class="space-y-1">
												<Label class="text-xs">{$t('settings.auth.oidc.modal.dockhandRole')}</Label>
												<Select.Root
													type="single"
													value={mapping.role_id ? String(mapping.role_id) : undefined}
													onValueChange={(value) => {
														if (value) {
															updateRoleMappingRole(index, parseInt(value));
														}
													}}
												>
													<Select.Trigger class="h-8">
														{#if mapping.role_id}
															{roles.find(r => r.id === mapping.role_id)?.name || $t('settings.auth.oidc.modal.selectRole')}
														{:else}
															{$t('settings.auth.oidc.modal.selectRole')}
														{/if}
													</Select.Trigger>
													<Select.Content>
														{#each roles as role}
															<Select.Item value={String(role.id)}>
																<div class="flex items-center gap-2">
																	<Shield class="w-3.5 h-3.5 text-muted-foreground" />
																	{role.name}
																</div>
															</Select.Item>
														{/each}
													</Select.Content>
												</Select.Root>
											</div>
										</div>
										<Button
											size="sm"
											variant="ghost"
											class="text-destructive hover:text-destructive h-8 w-8 p-0"
											onclick={() => removeRoleMapping(index)}
										>
											<Trash2 class="w-4 h-4" />
										</Button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</Tabs.Content>
		</Tabs.Root>

		<Dialog.Footer class="flex-shrink-0 border-t pt-4">
			<Button variant="outline" onclick={handleClose}>{$t('settings.auth.oidc.modal.cancel')}</Button>
			<Button onclick={save} disabled={formSaving}>
				{#if formSaving}
					<RefreshCw class="w-4 h-4 mr-1 animate-spin" />
				{:else if isEditing}
					<Check class="w-4 h-4" />
				{:else}
					<Plus class="w-4 h-4" />
				{/if}
				{isEditing ? $t('settings.auth.oidc.modal.save') : $t('settings.auth.oidc.modal.addProvider')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
