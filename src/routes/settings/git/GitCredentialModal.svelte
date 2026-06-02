<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { ToggleGroup } from '$lib/components/ui/toggle-pill';
	import { Key, KeyRound, Lock } from 'lucide-svelte';
	import { focusFirstInput } from '$lib/utils';
	import { t, translate } from '$lib/i18n';

	// Auth type options with icons
	const authTypeOptions = $derived([
		{ value: 'password', label: $t('settings.git.credentialModal.passwordToken'), icon: Lock },
		{ value: 'ssh', label: $t('settings.git.auth.sshKey'), icon: KeyRound }
	]);

	interface GitCredential {
		id: number;
		name: string;
		authType: 'none' | 'password' | 'ssh';
		username?: string;
		hasPassword: boolean;
		hasSshKey: boolean;
	}

	interface Props {
		open: boolean;
		credential?: GitCredential | null;
		onClose: () => void;
		onSaved: () => void;
	}

	let { open = $bindable(), credential = null, onClose, onSaved }: Props = $props();

	// Form state
	let formName = $state('');
	let formAuthType = $state<'none' | 'password' | 'ssh'>('password');
	let formUsername = $state('');
	let formPassword = $state('');
	let formSshKey = $state('');
	let formSshPassphrase = $state('');
	let formError = $state('');
	let formSaving = $state(false);
	let errors = $state<{ name?: string; password?: string; sshKey?: string }>({});

	const isEditing = $derived(credential !== null);

	// Track which credential was initialized to avoid repeated resets
	let lastInitializedCredId = $state<number | null | undefined>(undefined);

	$effect(() => {
		if (open) {
			const currentCredId = credential?.id ?? null;
			if (lastInitializedCredId !== currentCredId) {
				lastInitializedCredId = currentCredId;
				resetForm();
			}
		} else {
			lastInitializedCredId = undefined;
		}
	});

	function resetForm() {
		if (credential) {
			formName = credential.name;
			formAuthType = credential.authType;
			formUsername = credential.username || '';
			formPassword = '';
			formSshKey = '';
			formSshPassphrase = '';
		} else {
			formName = '';
			formAuthType = 'password';
			formUsername = '';
			formPassword = '';
			formSshKey = '';
			formSshPassphrase = '';
		}
		formError = '';
		errors = {};
	}

	async function saveCredential() {
		errors = {};
		let hasErrors = false;

		if (!formName.trim()) {
			errors.name = translate('settings.git.credentialModal.validation.nameRequired');
			hasErrors = true;
		}

		if (formAuthType === 'password' && !formPassword.trim() && !credential?.hasPassword) {
			errors.password = translate('settings.git.credentialModal.validation.passwordRequired');
			hasErrors = true;
		}

		if (formAuthType === 'ssh' && !formSshKey.trim() && !credential?.hasSshKey) {
			errors.sshKey = translate('settings.git.credentialModal.validation.sshKeyRequired');
			hasErrors = true;
		}

		if (hasErrors) return;

		formSaving = true;
		formError = '';

		try {
			const body: any = {
				name: formName.trim(),
				authType: formAuthType,
				username: formUsername.trim() || undefined
			};

			if (formAuthType === 'password') {
				body.password = formPassword;
			}

			if (formAuthType === 'ssh') {
				body.sshPrivateKey = formSshKey;
				if (formSshPassphrase) body.sshPassphrase = formSshPassphrase;
			}

			const url = credential
				? `/api/git/credentials/${credential.id}`
				: '/api/git/credentials';
			const method = credential ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const data = await response.json();

			if (!response.ok) {
				formError = data.error || translate('settings.git.credentialModal.errors.saveFailed');
				toast.error(formError);
				return;
			}

			onSaved();
			onClose();
			toast.success(credential ? translate('settings.git.credentialModal.toasts.updated') : translate('settings.git.credentialModal.toasts.created'));
		} catch (error) {
			formError = translate('settings.git.credentialModal.errors.saveFailed');
			toast.error(translate('settings.git.credentialModal.errors.saveFailed'));
		} finally {
			formSaving = false;
		}
	}

</script>

<Dialog.Root bind:open onOpenChange={(o) => { if (o) focusFirstInput(); else onClose(); }}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Key class="w-5 h-5" />
				{isEditing ? $t('settings.git.credentialModal.titleEdit') : $t('settings.git.credentialModal.titleAdd')}
			</Dialog.Title>
			<Dialog.Description>
				{isEditing ? $t('settings.git.credentialModal.descriptionEdit') : $t('settings.git.credentialModal.descriptionAdd')}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={(e) => { e.preventDefault(); saveCredential(); }} class="space-y-4">
			<div class="space-y-2">
				<Label for="cred-name">{$t('settings.git.credentialModal.name')}</Label>
				<Input
					id="cred-name"
					bind:value={formName}
					placeholder={$t('settings.git.credentialModal.namePlaceholder')}
					class={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
					oninput={() => errors.name = undefined}
				/>
				{#if errors.name}
					<p class="text-xs text-destructive">{errors.name}</p>
				{:else if !isEditing}
					<p class="text-xs text-muted-foreground">{$t('settings.git.credentialModal.nameHelp')}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label>{$t('settings.git.credentialModal.authType')}</Label>
				<ToggleGroup
					value={formAuthType}
					options={authTypeOptions}
					onchange={(val) => formAuthType = val as 'password' | 'ssh'}
				/>
			</div>

			<!-- Fixed height container to prevent layout jump -->
			<div class="min-h-[220px] space-y-4">
				{#if formAuthType === 'password'}
					<div class="space-y-2">
						<Label for="cred-username">{$t('settings.git.credentialModal.username')}</Label>
						<Input id="cred-username" bind:value={formUsername} placeholder={$t('settings.git.credentialModal.usernamePlaceholder')} />
					</div>
					<div class="space-y-2">
						<Label for="cred-password">{$t('settings.git.credentialModal.passwordOrToken')}</Label>
						<Input
							id="cred-password"
							type="password"
							bind:value={formPassword}
							placeholder={isEditing ? $t('settings.git.credentialModal.keepCurrentPlaceholder') : $t('settings.git.credentialModal.passwordPlaceholder')}
							class={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
							oninput={() => errors.password = undefined}
						/>
						{#if errors.password}
							<p class="text-xs text-destructive">{errors.password}</p>
						{:else if isEditing && credential?.hasPassword}
							<p class="text-xs text-muted-foreground">{$t('settings.git.credentialModal.currentPasswordSet')}</p>
						{/if}
					</div>
				{:else if formAuthType === 'ssh'}
					<div class="space-y-2">
						<Label for="cred-ssh-key">{$t('settings.git.credentialModal.sshPrivateKey')}</Label>
						<textarea
							id="cred-ssh-key"
							bind:value={formSshKey}
							class="w-full h-32 px-3 py-2 text-sm border rounded-md font-mono bg-background {errors.sshKey ? 'border-destructive focus-visible:ring-destructive' : ''}"
							placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
							oninput={() => errors.sshKey = undefined}
						></textarea>
						{#if errors.sshKey}
							<p class="text-xs text-destructive">{errors.sshKey}</p>
						{:else if isEditing && credential?.hasSshKey}
							<p class="text-xs text-muted-foreground">{$t('settings.git.credentialModal.currentSshKeySet')}</p>
						{/if}
					</div>
					<div class="space-y-2">
						<Label for="cred-ssh-passphrase">{$t('settings.git.credentialModal.sshPassphraseOptional')}</Label>
						<Input id="cred-ssh-passphrase" type="password" bind:value={formSshPassphrase} placeholder={$t('settings.git.credentialModal.sshPassphrasePlaceholder')} />
					</div>
				{/if}
			</div>

			{#if formError}
				<p class="text-sm text-destructive">{formError}</p>
			{/if}

			<Dialog.Footer>
				<Button variant="outline" type="button" onclick={onClose}>{$t('settings.git.credentialModal.cancel')}</Button>
				<Button type="submit" disabled={formSaving}>
					{formSaving ? $t('settings.git.credentialModal.saving') : (isEditing ? $t('settings.git.credentialModal.saveChanges') : $t('settings.git.credentialModal.addCredential'))}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
