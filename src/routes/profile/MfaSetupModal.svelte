<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { QrCode, RefreshCw, ShieldCheck, TriangleAlert, Copy, Download, Check, XCircle } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { copyToClipboard } from '$lib/utils/clipboard';
	import * as Alert from '$lib/components/ui/alert';
	import { focusFirstInput } from '$lib/utils';
	import { t, translate } from '$lib/i18n';

	interface Props {
		open: boolean;
		qrCode: string;
		secret: string;
		userId: number;
		onClose: () => void;
		onSuccess: () => void;
	}

	let { open = $bindable(), qrCode, secret, userId, onClose, onSuccess }: Props = $props();

	let token = $state('');
	let loading = $state(false);
	let error = $state('');
	let backupCodes = $state<string[]>([]);
	let showBackupCodes = $state(false);
	let copied = $state<'ok' | 'error' | null>(null);

	function resetForm() {
		token = '';
		error = '';
		backupCodes = [];
		showBackupCodes = false;
		copied = null;
	}

	async function verifyAndEnableMfa() {
		if (!token) {
			error = translate('profile.mfa.errors.codeRequired');
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/users/${userId}/mfa`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'verify', token })
			});

			const data = await response.json();

			if (response.ok) {
				backupCodes = data.backupCodes || [];
				showBackupCodes = true;
			} else {
				error = data.error || translate('profile.mfa.errors.invalidCode');
			}
		} catch (e) {
			error = translate('profile.mfa.errors.verifyFailed');
		} finally {
			loading = false;
		}
	}

	function formatBackupCodes(): string {
		return backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n');
	}

	async function copyBackupCodes() {
		const ok = await copyToClipboard(formatBackupCodes());
		copied = ok ? 'ok' : 'error';
		setTimeout(() => copied = null, 2000);
	}

	function downloadBackupCodes() {
		const content = `${translate('profile.mfa.backupFileTitle')}\n${'='.repeat(30)}\n\n${translate('profile.mfa.backupFileDescription')}\n${translate('profile.mfa.backupFileSingleUse')}\n\n${formatBackupCodes()}\n\n${translate('profile.mfa.generatedAt')}: ${new Date().toISOString()}`;
		const blob = new Blob([content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'dockhand-backup-codes.txt';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function handleDone() {
		onSuccess();
		onClose();
	}

</script>

<Dialog.Root bind:open onOpenChange={(o) => { if (o) { resetForm(); focusFirstInput(); } else if (!showBackupCodes) onClose(); }}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				{#if showBackupCodes}
					<ShieldCheck class="w-5 h-5 text-green-500" />
					{$t('profile.mfa.enabledTitle')}
				{:else}
					<QrCode class="w-5 h-5" />
					{$t('profile.mfa.setupTitle')}
				{/if}
			</Dialog.Title>
		</Dialog.Header>

		{#if showBackupCodes}
			<!-- Backup codes view -->
			<div class="space-y-4">
				<Alert.Root>
					<TriangleAlert class="h-4 w-4" />
					<Alert.Description>
						{$t('profile.mfa.backupCodesWarning')}
					</Alert.Description>
				</Alert.Root>

				<div class="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
					{#each backupCodes as code, i}
						<div class="flex items-center gap-2">
							<span class="text-muted-foreground w-4">{i + 1}.</span>
							<span>{code}</span>
						</div>
					{/each}
				</div>

				<div class="flex gap-2">
					<Button variant="outline" class="flex-1" onclick={copyBackupCodes}>
						{#if copied === 'error'}
							<Tooltip.Root open>
								<Tooltip.Trigger>
									<XCircle class="w-4 h-4 text-red-500" />
								</Tooltip.Trigger>
								<Tooltip.Content>{$t('profile.mfa.copyRequiresHttps')}</Tooltip.Content>
							</Tooltip.Root>
							{$t('common.states.failed')}
						{:else if copied === 'ok'}
							<Check class="w-4 h-4" />
							{$t('images.tooltips.copied')}
						{:else}
							<Copy class="w-4 h-4" />
							{$t('profile.mfa.copyCodes')}
						{/if}
					</Button>
					<Button variant="outline" class="flex-1" onclick={downloadBackupCodes}>
						<Download class="w-4 h-4" />
						{$t('common.actions.download')}
					</Button>
				</div>
			</div>
			<Dialog.Footer>
				<Button onclick={handleDone}>
					<ShieldCheck class="w-4 h-4" />
					{$t('common.actions.done')}
				</Button>
			</Dialog.Footer>
		{:else}
			<!-- Setup view -->
			<div class="space-y-4">
				{#if error}
					<Alert.Root variant="destructive">
						<TriangleAlert class="h-4 w-4" />
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				{/if}

				<p class="text-sm text-muted-foreground">
					{$t('profile.mfa.scanQrHelp')}
				</p>

				{#if qrCode}
					<div class="flex justify-center p-4 bg-white rounded-lg">
						<img src={qrCode} alt={$t('profile.mfa.qrCodeAlt')} class="w-48 h-48" />
					</div>
				{/if}

				<div class="space-y-2">
					<Label class="text-xs text-muted-foreground">{$t('profile.mfa.manualCodeLabel')}</Label>
					<code class="block p-2 bg-muted rounded text-sm font-mono break-all">{secret}</code>
				</div>

				<div class="space-y-2">
					<Label>{$t('profile.mfa.verificationCode')}</Label>
					<Input
						bind:value={token}
						name="totp"
						placeholder={$t('profile.mfa.codePlaceholder')}
						maxlength={6}
						autocomplete="one-time-code"
					/>
					<p class="text-xs text-muted-foreground">
						{$t('profile.mfa.verifySetupHelp')}
					</p>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={onClose}>{$t('common.actions.cancel')}</Button>
				<Button onclick={verifyAndEnableMfa} disabled={loading || !token}>
					{#if loading}
						<RefreshCw class="w-4 h-4 animate-spin" />
					{:else}
						<ShieldCheck class="w-4 h-4" />
					{/if}
					{$t('profile.mfa.enableMfa')}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
