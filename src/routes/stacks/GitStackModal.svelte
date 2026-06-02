<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { TogglePill } from '$lib/components/ui/toggle-pill';
	import { Loader2, GitBranch, RefreshCw, Webhook, Rocket, RefreshCcw, Copy, Check, XCircle, FolderGit2, Github, Key, KeyRound, Lock, FileText, HelpCircle, GripVertical, X, Download, Hammer, ArrowDownToLine, Zap, FolderOpen, Ban, TriangleAlert } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { copyToClipboard } from '$lib/utils/clipboard';
	import CronEditor from '$lib/components/cron-editor.svelte';
	import StackEnvVarsPanel from '$lib/components/StackEnvVarsPanel.svelte';
	import { type EnvVar, type ValidationResult } from '$lib/components/StackEnvVarsEditor.svelte';
	import { toast } from 'svelte-sonner';
	import { focusFirstInput } from '$lib/utils';
	import { readJobResponse } from '$lib/utils/sse-fetch';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte';
	import { t, translate } from '$lib/i18n';

	// Get sidebar state to adjust modal positioning
	const sidebar = useSidebar();

	// localStorage key for persisted split ratio
	const STORAGE_KEY_SPLIT = 'dockhand-git-stack-modal-split';

	interface GitCredential {
		id: number;
		name: string;
		authType: string;
	}

	function getAuthLabel(authType: string) {
		switch (authType) {
			case 'ssh': return translate('stacks.gitModal.auth.sshKey');
			case 'password': return translate('stacks.gitModal.auth.password');
			default: return translate('stacks.gitModal.auth.none');
		}
	}

	interface GitRepository {
		id: number;
		name: string;
		url: string;
		branch: string;
		credential_id: number | null;
	}

	interface GitStack {
		id: number;
		stackName: string;
		repositoryId: number;
		environmentId: number | null;
		composePath: string;
		envFilePath: string | null;
		autoUpdate: boolean;
		autoUpdateSchedule: 'daily' | 'weekly' | 'custom';
		autoUpdateCron: string;
		webhookEnabled: boolean;
		webhookSecret: string | null;
		contextDir: string | null;
		buildOnDeploy: boolean;
		noBuildCache: boolean;
		repullImages: boolean;
		forceRedeploy: boolean;
	}

	interface Props {
		open: boolean;
		gitStack?: GitStack | null;
		environmentId?: number | null;
		repositories: GitRepository[];
		credentials: GitCredential[];
		onClose: () => void;
		onSaved: () => void;
	}

	let { open = $bindable(), gitStack = null, environmentId = null, repositories, credentials, onClose, onSaved }: Props = $props();

	// Form state - repository selection or creation
	let formRepoMode = $state<'existing' | 'new'>('existing');
	let formRepositoryId = $state<number | null>(null);
	let formNewRepoName = $state('');
	let formNewRepoUrl = $state('');
	let formNewRepoBranch = $state('main');
	let formNewRepoCredentialId = $state<number | null>(null);

	// Form state - stack deployment config
	let formStackName = $state('');
	let formStackNameUserModified = $state(false);
	let formComposePath = $state('compose.yaml');
	let formAutoUpdate = $state(false);
	let formAutoUpdateCron = $state('0 3 * * *');
	let formWebhookEnabled = $state(false);
	let formWebhookSecret = $state('');
	let formContextDir = $state<string | null>(null);
	let formBuildOnDeploy = $state(false);
	let formNoBuildCache = $state(false);
	let formRepullImages = $state(false);
	let formForceRedeploy = $state(false);
	let formDeployNow = $state(false);
	let formError = $state('');
	let formSaving = $state(false);
	let showExistsWarning = $state(false);
	let errors = $state<{ stackName?: string; repository?: string; repoName?: string; repoUrl?: string }>({});

	// Stack name validation: must start with alphanumeric, can contain alphanumeric, hyphens, underscores
	const STACK_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
	let copiedWebhookUrl = $state<'ok' | 'error' | null>(null);
	let copiedWebhookSecret = $state<'ok' | 'error' | null>(null);

	// Environment variables state
	let formEnvFilePath = $state<string | null>(null);
	let envFiles = $state<string[]>([]);
	let loadingEnvFiles = $state(false);
	let envVars = $state<EnvVar[]>([]);
	let fileEnvVars = $state<Record<string, string>>({});
	let loadingFileVars = $state(false);
	let existingSecretKeys = $state<Set<string>>(new Set());
	let populatingEnvVars = $state(false);

	// Resizable split panel state
	let splitRatio = $state(60); // percentage for form panel
	let isDraggingSplit = $state(false);
	let containerRef: HTMLDivElement | null = $state(null);


	// Track which gitStack was initialized to avoid repeated resets
	let lastInitializedStackId = $state<number | null | undefined>(undefined);
	let isInitializing = $state(false);

	$effect(() => {
		if (open) {
			const currentStackId = gitStack?.id ?? null;
			if (lastInitializedStackId !== currentStackId && !isInitializing) {
				lastInitializedStackId = currentStackId;
				isInitializing = true;
				resetForm().finally(() => {
					isInitializing = false;
				});
			}
		} else {
			lastInitializedStackId = undefined;
		}
	});

	// Derived state for selected repository
	let selectedRepo = $derived(formRepositoryId ? repositories.find(r => r.id === formRepositoryId) : null);

	onMount(() => {
		// Load saved split ratio
		const savedSplit = localStorage.getItem(STORAGE_KEY_SPLIT);
		if (savedSplit) {
			const ratio = parseFloat(savedSplit);
			if (!isNaN(ratio) && ratio >= 30 && ratio <= 80) {
				splitRatio = ratio;
			}
		}

		// Add global mouse event listeners for split dragging
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
	});

	onDestroy(() => {
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', handleMouseUp);
	});

	// Split panel drag handlers
	function startSplitDrag(e: MouseEvent) {
		e.preventDefault();
		isDraggingSplit = true;
	}

	function handleMouseMove(e: MouseEvent) {
		if (isDraggingSplit && containerRef) {
			const rect = containerRef.getBoundingClientRect();
			const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
			splitRatio = Math.max(30, Math.min(80, newRatio));
		}
	}

	function handleMouseUp() {
		if (isDraggingSplit) {
			isDraggingSplit = false;
			// Save split ratio
			localStorage.setItem(STORAGE_KEY_SPLIT, splitRatio.toString());
		}
	}

	function generateWebhookSecret(): string {
		const array = new Uint8Array(24);
		crypto.getRandomValues(array);
		return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
	}

	function getWebhookUrl(stackId: number): string {
		return `${window.location.origin}/api/git/stacks/${stackId}/webhook`;
	}

	async function copyWebhookField(text: string, type: 'url' | 'secret') {
		const ok = await copyToClipboard(text);
		const state = ok ? 'ok' : 'error';
		if (type === 'url') {
			copiedWebhookUrl = state;
			setTimeout(() => copiedWebhookUrl = null, 2000);
		} else {
			copiedWebhookSecret = state;
			setTimeout(() => copiedWebhookSecret = null, 2000);
		}
	}

	async function loadEnvFiles() {
		if (!gitStack) return;

		loadingEnvFiles = true;
		try {
			const response = await fetch(`/api/git/stacks/${gitStack.id}/env-files`);
			if (response.ok) {
				const data = await response.json();
				envFiles = data.files || [];
			}
		} catch (e) {
			console.error('Failed to load env files:', e);
		} finally {
			loadingEnvFiles = false;
		}
	}

	async function loadEnvFileContents(path: string) {
		if (!gitStack || !path) {
			fileEnvVars = {};
			return;
		}

		loadingFileVars = true;
		try {
			const response = await fetch(`/api/git/stacks/${gitStack.id}/env-files`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path })
			});
			if (response.ok) {
				const data = await response.json();
				fileEnvVars = data.vars || {};
			}
		} catch (e) {
			console.error('Failed to load env file contents:', e);
			fileEnvVars = {};
		} finally {
			loadingFileVars = false;
		}
	}

	async function loadEnvVarsOverrides() {
		if (!gitStack) return;

		try {
			// Use gitStack.environmentId when editing, fall back to prop for new stacks
			const envIdToUse = gitStack.environmentId ?? environmentId;
			const response = await fetch(`/api/stacks/${encodeURIComponent(gitStack.stackName)}/env${envIdToUse ? `?env=${envIdToUse}` : ''}`);
			if (response.ok) {
				const data = await response.json();
				const loadedVars = data.variables || [];
				// Track existing secret keys (secrets loaded from DB cannot have visibility toggled)
				existingSecretKeys = new Set(
					loadedVars.filter((v: EnvVar) => v.isSecret && v.key.trim()).map((v: EnvVar) => v.key.trim())
				);
				// Set envVars - the panel's $effect will auto-sync rawContent for text view
				envVars = loadedVars;
			}
		} catch (e) {
			console.error('Failed to load env var overrides:', e);
		}
	}

	async function populateEnvVars() {
		// Validate we have repository info
		if (formRepoMode === 'existing' && !formRepositoryId) {
			toast.error(translate('stacks.gitModal.toasts.selectRepositoryFirst'));
			return;
		}
		if (formRepoMode === 'new' && !formNewRepoUrl.trim()) {
			toast.error(translate('stacks.gitModal.toasts.enterRepositoryUrlFirst'));
			return;
		}

		populatingEnvVars = true;
		try {
			const body: Record<string, any> = {
				composePath: formComposePath || 'compose.yaml',
				envFilePath: formEnvFilePath || null
			};

			if (formRepoMode === 'existing') {
				body.repositoryId = formRepositoryId;
			} else {
				body.url = formNewRepoUrl;
				body.branch = formNewRepoBranch || 'main';
				body.credentialId = formNewRepoCredentialId;
			}

			const response = await fetch('/api/git/preview-env', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const data = await response.json();

			if (!response.ok) {
				toast.error(translate('stacks.gitModal.toasts.loadEnvFailed'), {
					description: data.error || translate('common.errors.unknown')
				});
				return;
			}

			const vars = data.vars as Record<string, string>;
			const count = Object.keys(vars).length;

			if (count === 0) {
				toast.info(translate('stacks.gitModal.toasts.noEnvFound'), {
					description: translate('stacks.gitModal.toasts.noEnvFoundDescription')
				});
				return;
			}

			// Convert to EnvVar array - preserve existing user entries that aren't in repo
			const existingUserVars = envVars.filter(v => v.key.trim() && !(v.key in vars));
			const newVars: EnvVar[] = Object.entries(vars).map(([key, value]) => ({
				key,
				value,
				isSecret: false
			}));

			envVars = [...newVars, ...existingUserVars];
			fileEnvVars = vars;

			toast.success(translate(count === 1 ? 'stacks.gitModal.toasts.loadedVariableOne' : 'stacks.gitModal.toasts.loadedVariableMany', { count }), {
				description: translate('stacks.gitModal.toasts.loadedVariablesDescription')
			});
		} catch (e) {
			console.error('Failed to populate env vars:', e);
			toast.error(translate('stacks.gitModal.toasts.loadEnvFailed'));
		} finally {
			populatingEnvVars = false;
		}
	}

	async function resetForm() {
		// Clear state BEFORE async loads to avoid race conditions
		formError = '';
		errors = {};
		copiedWebhookUrl = null;
		copiedWebhookSecret = null;
		envFiles = [];
		envVars = [];
		fileEnvVars = {};
		existingSecretKeys = new Set();

		if (gitStack) {
			formRepoMode = 'existing';
			formRepositoryId = gitStack.repositoryId;
			formStackName = gitStack.stackName;
			formComposePath = gitStack.composePath;
			formEnvFilePath = gitStack.envFilePath;
			formAutoUpdate = gitStack.autoUpdate;
			formAutoUpdateCron = gitStack.autoUpdateCron || '0 3 * * *';
			formWebhookEnabled = gitStack.webhookEnabled;
			formWebhookSecret = gitStack.webhookSecret || '';
			formContextDir = gitStack.contextDir ?? null;
			formBuildOnDeploy = gitStack.buildOnDeploy ?? false;
			formNoBuildCache = gitStack.noBuildCache ?? false;
			formRepullImages = gitStack.repullImages ?? false;
			formForceRedeploy = gitStack.forceRedeploy ?? false;
			formDeployNow = false;

			// Load env files and overrides SYNCHRONOUSLY to avoid race conditions
			// Wait for all loads to complete before allowing any other effect to run
			await Promise.all([
				loadEnvFiles(),
				loadEnvVarsOverrides(),
				gitStack.envFilePath ? loadEnvFileContents(gitStack.envFilePath) : Promise.resolve()
			]);
		} else {
			formRepoMode = repositories.length > 0 ? 'existing' : 'new';
			formRepositoryId = null;
			formNewRepoName = '';
			formNewRepoUrl = '';
			formNewRepoBranch = 'main';
			formNewRepoCredentialId = null;
			formStackName = '';
			formStackNameUserModified = false;
			formComposePath = 'compose.yaml';
			formEnvFilePath = null;
			formAutoUpdate = false;
			formAutoUpdateCron = '0 3 * * *';
			formWebhookEnabled = false;
			formWebhookSecret = '';
			formContextDir = null;
			formBuildOnDeploy = false;
			formNoBuildCache = false;
			formRepullImages = false;
			formForceRedeploy = false;
			formDeployNow = false;
		}
	}

	async function saveGitStack(deployAfterSave: boolean = false) {
		errors = {};
		let hasErrors = false;

		const trimmedStackName = formStackName.trim();
		if (!trimmedStackName) {
			errors.stackName = translate('stacks.gitModal.validation.stackNameRequired');
			hasErrors = true;
		} else if (!STACK_NAME_REGEX.test(trimmedStackName)) {
			errors.stackName = translate('stacks.gitModal.validation.stackNameInvalid');
			hasErrors = true;
		}

		if (formRepoMode === 'existing' && !formRepositoryId) {
			errors.repository = translate('stacks.gitModal.validation.repositoryRequired');
			hasErrors = true;
		}

		if (formRepoMode === 'new' && !formNewRepoName.trim()) {
			errors.repoName = translate('stacks.gitModal.validation.repoNameRequired');
			hasErrors = true;
		}

		if (formRepoMode === 'new' && !formNewRepoUrl.trim()) {
			errors.repoUrl = translate('stacks.gitModal.validation.repoUrlRequired');
			hasErrors = true;
		}

		if (hasErrors) return;

		// Check if stack already exists (only for new stacks)
		if (!gitStack) {
			try {
				const stacksResponse = await fetch(`/api/stacks?env=${environmentId}`);
				if (stacksResponse.ok) {
					const stacks = await stacksResponse.json();
					const existingStack = stacks.find((s: { name: string }) =>
						s.name.toLowerCase() === formStackName.trim().toLowerCase()
					);
					if (existingStack) {
						showExistsWarning = true;
						return;
					}
				}
			} catch (e) {
				console.warn('Failed to check for existing stacks:', e);
			}
		}

		formSaving = true;
		formError = '';

		try {
			// Only save vars that are actual overrides (differ from file) or new (not in file)
			// This ensures file updates from git are picked up on next sync
			const overrideVars = envVars.filter(v => {
				if (!v.key.trim()) return false;
				const fileValue = fileEnvVars[v.key];
				// Save if: not in file (new var), value differs from file, or is a secret
				return fileValue === undefined || v.value !== fileValue || v.isSecret;
			});

			let body: any = {
				stackName: formStackName,
				composePath: formComposePath || 'compose.yaml',
				envFilePath: formEnvFilePath,
				environmentId: environmentId,
				autoUpdate: formAutoUpdate,
				autoUpdateCron: formAutoUpdateCron,
				webhookEnabled: formWebhookEnabled,
				webhookSecret: formWebhookEnabled ? formWebhookSecret : null,
				contextDir: formContextDir || null,
				buildOnDeploy: formBuildOnDeploy,
				noBuildCache: formNoBuildCache,
				repullImages: formRepullImages,
				forceRedeploy: formForceRedeploy,
				deployNow: deployAfterSave,
				envVars: overrideVars.map(v => ({
					key: v.key.trim(),
					value: v.value,
					isSecret: v.isSecret
				}))
			};

			if (formRepoMode === 'existing') {
				body.repositoryId = formRepositoryId;
			} else {
				// Create new repo inline
				body.repoName = formNewRepoName;
				body.url = formNewRepoUrl;
				body.branch = formNewRepoBranch || 'main';
				body.credentialId = formNewRepoCredentialId;
			}

			const url = gitStack
				? `/api/git/stacks/${gitStack.id}`
				: '/api/git/stacks';
			const method = gitStack ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const data = await readJobResponse(response);

			if (!response.ok) {
				formError = data.error || translate('stacks.gitModal.errors.saveFailed');
				return;
			}

			// Check if deployment failed
			if (data.deployResult && !data.deployResult.success) {
				toast.error(translate('stacks.gitModal.toasts.deploymentFailed'), {
					description: data.deployResult.error || translate('common.errors.unknown')
				});
				onSaved(); // Still refresh the list to show the new stack
				onClose(); // Close modal, error shown as toast
				return;
			}

			onSaved();
			onClose();
		} catch (error) {
			formError = translate('stacks.gitModal.errors.saveFailed');
		} finally {
			formSaving = false;
		}
	}

	// Auto-populate stack name from selected repo and compose path (only if user hasn't manually edited)
	$effect(() => {
		if (formRepoMode === 'existing' && formRepositoryId && !gitStack && !formStackNameUserModified) {
			const repo = repositories.find(r => r.id === formRepositoryId);
			if (repo) {
				// Normalize repo name: lowercase, spaces/underscores to hyphens, strip invalid chars
				const normalizedName = repo.name
					.toLowerCase()
					.replace(/[\s_]+/g, '-')
					.replace(/[^a-z0-9-]/g, '')
					.replace(/-+/g, '-')
					.replace(/^-|-$/g, '');

				// Extract compose filename without extension for stack name
				const composeName = formComposePath
					.replace(/^.*\//, '') // Remove directory path
					.replace(/\.(yml|yaml)$/i, '') // Remove extension
					.replace(/^docker-compose\.?/, '') // Remove docker-compose prefix
					.replace(/^compose$/, ''); // Remove plain "compose"

				// Combine repo name with compose name if it's not the default
				if (composeName && composeName !== 'docker-compose') {
					formStackName = `${normalizedName}-${composeName}`;
				} else {
					formStackName = normalizedName;
				}
			}
		}
	});
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => { if (isOpen) focusFirstInput(); }}>
	<Dialog.Content
		class="max-w-none h-[95vh] flex flex-col p-0 gap-0 shadow-xl border-zinc-200 dark:border-zinc-700 {sidebar.state === 'collapsed' ? 'w-[calc(100vw-6rem)] ml-[1.5rem]' : 'w-[calc(100vw-12rem)] ml-[4.5rem]'}"
		showCloseButton={false}
	>
		<Dialog.Header class="px-5 py-3 border-b border-zinc-200 dark:border-zinc-700 flex-shrink-0">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="p-1.5 rounded-md bg-zinc-200 dark:bg-zinc-700">
						<GitBranch class="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
					</div>
					<div>
						<Dialog.Title class="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
							{gitStack ? $t('stacks.gitModal.titleEdit') : $t('stacks.gitModal.titleCreate')}
						</Dialog.Title>
						<Dialog.Description class="text-xs text-zinc-500 dark:text-zinc-400">
							{gitStack ? $t('stacks.gitModal.descriptionEdit') : $t('stacks.gitModal.descriptionCreate')}
						</Dialog.Description>
					</div>
				</div>

				<!-- Close button -->
				<button
					onclick={onClose}
					class="p-1.5 rounded-md text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
				>
					<X class="w-4 h-4" />
				</button>
			</div>
		</Dialog.Header>

		<div bind:this={containerRef} class="flex-1 min-h-0 flex {isDraggingSplit ? 'select-none' : ''}">
			<!-- Left column: Form fields -->
			<div class="flex-shrink-0 flex flex-col min-w-0 overflow-y-auto" style="width: {splitRatio}%">
				<div class="space-y-4 py-4 px-6">
			<!-- Repository selection -->
			{#if !gitStack}
				<div class="space-y-3">
					<Label>{$t('stacks.gitModal.repository')}</Label>
					<div class="flex gap-2">
						<Button
							variant={formRepoMode === 'existing' ? 'default' : 'outline'}
							size="sm"
							onclick={() => formRepoMode = 'existing'}
							disabled={repositories.length === 0}
						>
							{$t('stacks.gitModal.selectExisting')}
						</Button>
						<Button
							variant={formRepoMode === 'new' ? 'default' : 'outline'}
							size="sm"
							onclick={() => formRepoMode = 'new'}
						>
							{$t('stacks.gitModal.addNew')}
						</Button>
					</div>

					{#if formRepoMode === 'existing'}
						<Select.Root
							type="single"
							value={formRepositoryId?.toString() ?? ''}
							onValueChange={(v) => { formRepositoryId = v ? parseInt(v) : null; errors.repository = undefined; }}
						>
							<Select.Trigger class="w-full {errors.repository ? 'border-destructive' : ''}">
								{#if selectedRepo}
									{@const repoPath = selectedRepo.url.replace(/^https?:\/\/[^/]+\//, '').replace(/\.git$/, '')}
									<div class="flex items-center gap-2 text-left">
										{#if selectedRepo.url.includes('github.com')}
											<Github class="w-4 h-4 shrink-0 text-muted-foreground" />
										{:else}
											<FolderGit2 class="w-4 h-4 shrink-0 text-muted-foreground" />
										{/if}
										<span class="truncate">{selectedRepo.name}</span>
										<span class="text-muted-foreground text-xs truncate hidden sm:inline">({repoPath})</span>
									</div>
								{:else}
									<span class="text-muted-foreground">{$t('stacks.gitModal.selectRepositoryPlaceholder')}</span>
								{/if}
							</Select.Trigger>
							<Select.Content>
								{#each repositories as repo}
									{@const repoPath = repo.url.replace(/^https?:\/\/[^/]+\//, '').replace(/\.git$/, '')}
									<Select.Item value={repo.id.toString()} label={repo.name}>
										<div class="flex items-center gap-2">
											{#if repo.url.includes('github.com')}
												<Github class="w-4 h-4 shrink-0 text-muted-foreground" />
											{:else}
												<FolderGit2 class="w-4 h-4 shrink-0 text-muted-foreground" />
											{/if}
											<span>{repo.name}</span>
											<span class="text-muted-foreground text-xs">- {repoPath}</span>
											<span class="text-muted-foreground text-xs flex items-center gap-1">
												<GitBranch class="w-3 h-3" />
												{repo.branch}
											</span>
										</div>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{#if errors.repository}
							<p class="text-xs text-destructive">{errors.repository}</p>
						{:else if repositories.length === 0}
							<p class="text-xs text-muted-foreground">
								{$t('stacks.gitModal.noRepositories')}
							</p>
						{/if}
					{:else}
						<div class="space-y-3 p-3 border rounded-md bg-muted/30">
							<div class="space-y-2">
								<Label for="new-repo-name">{$t('stacks.gitModal.repositoryName')}</Label>
								<Input
									id="new-repo-name"
									bind:value={formNewRepoName}
									placeholder={$t('stacks.gitModal.repositoryNamePlaceholder')}
									class={errors.repoName ? 'border-destructive focus-visible:ring-destructive' : ''}
									oninput={() => errors.repoName = undefined}
								/>
								{#if errors.repoName}
									<p class="text-xs text-destructive">{errors.repoName}</p>
								{/if}
							</div>
							<div class="space-y-2">
								<Label for="new-repo-url">{$t('stacks.gitModal.repositoryUrl')}</Label>
								<Input
									id="new-repo-url"
									bind:value={formNewRepoUrl}
									placeholder="https://github.com/user/repo.git"
									class={errors.repoUrl ? 'border-destructive focus-visible:ring-destructive' : ''}
									oninput={() => errors.repoUrl = undefined}
								/>
								{#if errors.repoUrl}
									<p class="text-xs text-destructive">{errors.repoUrl}</p>
								{/if}
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div class="space-y-2">
									<Label for="new-repo-branch">{$t('stacks.gitModal.branch')}</Label>
									<Input id="new-repo-branch" bind:value={formNewRepoBranch} placeholder="main" />
								</div>
								<div class="space-y-2">
									<Label for="new-repo-credential">{$t('stacks.gitModal.credential')}</Label>
									<Select.Root
										type="single"
										value={formNewRepoCredentialId?.toString() ?? 'none'}
										onValueChange={(v) => formNewRepoCredentialId = v === 'none' ? null : parseInt(v)}
									>
										<Select.Trigger class="w-full">
											{@const selectedCred = credentials.find(c => c.id === formNewRepoCredentialId)}
											{#if selectedCred}
												{#if selectedCred.authType === 'ssh'}
													<KeyRound class="w-4 h-4 mr-2 text-muted-foreground" />
												{:else if selectedCred.authType === 'password'}
													<Lock class="w-4 h-4 mr-2 text-muted-foreground" />
												{:else}
													<Key class="w-4 h-4 mr-2 text-muted-foreground" />
												{/if}
												<span>{selectedCred.name} ({getAuthLabel(selectedCred.authType)})</span>
											{:else}
												<Key class="w-4 h-4 mr-2 text-muted-foreground" />
												<span>{$t('stacks.gitModal.nonePublic')}</span>
											{/if}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="none">
												<span class="flex items-center gap-2">
													<Key class="w-4 h-4 text-muted-foreground" />
													{$t('stacks.gitModal.nonePublic')}
												</span>
											</Select.Item>
											{#each credentials as cred}
												<Select.Item value={cred.id.toString()}>
													<span class="flex items-center gap-2">
														{#if cred.authType === 'ssh'}
															<KeyRound class="w-4 h-4 text-muted-foreground" />
														{:else if cred.authType === 'password'}
															<Lock class="w-4 h-4 text-muted-foreground" />
														{:else}
															<Key class="w-4 h-4 text-muted-foreground" />
														{/if}
														{cred.name} ({getAuthLabel(cred.authType)})
													</span>
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Stack configuration -->
			<div class="space-y-2">
				<Label for="stack-name">{$t('stacks.gitModal.stackName')}</Label>
				<Input
					id="stack-name"
					bind:value={formStackName}
					placeholder={$t('stacks.gitModal.stackNamePlaceholder')}
					class={errors.stackName ? 'border-destructive focus-visible:ring-destructive' : ''}
					oninput={() => { errors.stackName = undefined; formStackNameUserModified = true; }}
				/>
				{#if errors.stackName}
					<p class="text-xs text-destructive">{errors.stackName}</p>
				{:else}
					<p class="text-xs text-muted-foreground">{$t('stacks.gitModal.stackNameHelp')}</p>
				{/if}
			</div>

			{#if gitStack && selectedRepo}
				<div class="space-y-2">
					<Label>{$t('stacks.gitModal.repository')}</Label>
					<div class="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
						<FolderGit2 class="w-3.5 h-3.5 shrink-0" />
						<span class="truncate" title={selectedRepo.url}>{selectedRepo.url}</span>
						{#if selectedRepo.branch}
							<Badge variant="outline" class="text-2xs py-0 px-1.5 shrink-0">{selectedRepo.branch}</Badge>
						{/if}
					</div>
				</div>
			{/if}

			<div class="space-y-2">
				<Label for="compose-path">{$t('stacks.gitModal.composePath')}</Label>
				<Input id="compose-path" bind:value={formComposePath} placeholder="compose.yaml" />
				<p class="text-xs text-muted-foreground">{$t('stacks.gitModal.composePathHelp')}</p>
			</div>

			<!-- Additional env file for variable substitution -->
			<div class="space-y-2">
				<div class="flex items-center gap-1.5">
					<Label for="env-file-path">{$t('stacks.gitModal.additionalEnvFile')}</Label>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<HelpCircle class="w-3.5 h-3.5 text-muted-foreground cursor-help" />
						</Tooltip.Trigger>
						<Tooltip.Content>
							<div class="w-80">
								<p class="text-xs">{$t('stacks.gitModal.envFileTooltipDefault')}</p>
								<p class="text-xs mt-2">{$t('stacks.gitModal.envFileTooltipAdditional')}</p>
								<p class="text-xs mt-2">{$t('stacks.gitModal.envFileTooltipOverrides')}</p>
							</div>
						</Tooltip.Content>
					</Tooltip.Root>
				</div>
					<Input
						id="env-file-path"
						bind:value={formEnvFilePath}
						placeholder=""
					/>
				<p class="text-xs text-muted-foreground">{$t('stacks.gitModal.additionalEnvFileHelp')}</p>
			</div>

			<!-- Context directory -->
			<div class="space-y-2">
				<div class="flex items-center gap-1.5">
					<Label for="context-dir">{$t('stacks.gitModal.contextDirectory')}</Label>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<HelpCircle class="w-3.5 h-3.5 text-muted-foreground cursor-help" />
						</Tooltip.Trigger>
						<Tooltip.Content>
							<div class="w-80">
								<p class="text-xs">{$t('stacks.gitModal.contextTooltipWorkingDirectory')}</p>
								<p class="text-xs mt-2">{$t('stacks.gitModal.contextTooltipRoot')}</p>
								<p class="text-xs mt-2">{$t('stacks.gitModal.contextTooltipDefault')}</p>
							</div>
						</Tooltip.Content>
					</Tooltip.Root>
				</div>
				<Input
					id="context-dir"
					value={formContextDir ?? ''}
					oninput={(e) => { const v = (e.target as HTMLInputElement).value; formContextDir = v.trim() || null; }}
					placeholder={$t('stacks.gitModal.contextPlaceholder')}
				/>
				<p class="text-xs text-muted-foreground">{$t('stacks.gitModal.contextHelp')}</p>
			</div>

			<!-- Auto-update section -->
			<div class="space-y-3 p-3 bg-muted/50 rounded-md">
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-2 flex-1">
					<RefreshCw class="w-4 h-4 text-muted-foreground" />
					<Label class="text-sm font-normal">{$t('stacks.gitModal.enableScheduledSync')}</Label>
				</div>
				<TogglePill bind:checked={formAutoUpdate} />
			</div>
				<p class="text-xs text-muted-foreground">
					{$t('stacks.gitModal.enableScheduledSyncHelp')}
				</p>
				{#if formAutoUpdate}
					<CronEditor
						value={formAutoUpdateCron}
						onchange={(cron) => formAutoUpdateCron = cron}
					/>
				{/if}
			</div>

			<!-- Webhook section -->
			<div class="space-y-3 p-3 bg-muted/50 rounded-md">
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-2 flex-1">
					<Webhook class="w-4 h-4 text-muted-foreground" />
					<Label class="text-sm font-normal">{$t('stacks.gitModal.enableWebhook')}</Label>
				</div>
				<TogglePill bind:checked={formWebhookEnabled} />
			</div>
				<p class="text-xs text-muted-foreground">
					{$t('stacks.gitModal.enableWebhookHelp')}
				</p>
				{#if formWebhookEnabled}
					{#if gitStack}
						<div class="space-y-2">
							<Label>{$t('stacks.gitModal.webhookUrl')}</Label>
							<div class="flex gap-2">
								<Input
									value={getWebhookUrl(gitStack.id)}
									readonly
									class="font-mono text-xs bg-background"
								/>
								<Button
									variant="outline"
									size="sm"
									onclick={() => copyWebhookField(getWebhookUrl(gitStack.id), 'url')}
									title={$t('stacks.gitModal.copyUrl')}
								>
									{#if copiedWebhookUrl === 'error'}
										<Tooltip.Root open>
											<Tooltip.Trigger>
												<XCircle class="w-4 h-4 text-red-500" />
											</Tooltip.Trigger>
											<Tooltip.Content>{$t('stacks.pathBar.copyRequiresHttps')}</Tooltip.Content>
										</Tooltip.Root>
									{:else if copiedWebhookUrl === 'ok'}
										<Check class="w-4 h-4 text-green-500" />
									{:else}
										<Copy class="w-4 h-4" />
									{/if}
								</Button>
							</div>
						</div>
					{/if}
					<div class="space-y-2">
						<Label for="webhook-secret">{$t('stacks.gitModal.webhookSecret')}</Label>
						<div class="flex gap-2">
							<Input
								id="webhook-secret"
								bind:value={formWebhookSecret}
								placeholder={$t('stacks.gitModal.webhookSecretPlaceholder')}
								class="font-mono text-xs"
							/>
							{#if gitStack && formWebhookSecret}
								<Button
									variant="outline"
									size="sm"
									onclick={() => copyWebhookField(formWebhookSecret, 'secret')}
									title={$t('stacks.gitModal.copySecret')}
								>
									{#if copiedWebhookSecret === 'error'}
										<Tooltip.Root open>
											<Tooltip.Trigger>
												<XCircle class="w-4 h-4 text-red-500" />
											</Tooltip.Trigger>
											<Tooltip.Content>{$t('stacks.pathBar.copyRequiresHttps')}</Tooltip.Content>
										</Tooltip.Root>
									{:else if copiedWebhookSecret === 'ok'}
										<Check class="w-4 h-4 text-green-500" />
									{:else}
										<Copy class="w-4 h-4" />
									{/if}
								</Button>
							{/if}
							<Tooltip.Root>
								<Tooltip.Trigger>
									<Button
										variant="outline"
										size="sm"
										onclick={() => formWebhookSecret = generateWebhookSecret()}
									>
										<Key class="w-4 h-4" />
									</Button>
								</Tooltip.Trigger>
								<Tooltip.Content>{$t('stacks.gitModal.generateSecret')}</Tooltip.Content>
							</Tooltip.Root>
						</div>
					</div>
					{#if !gitStack}
						<p class="text-xs text-muted-foreground">
							{$t('stacks.gitModal.webhookUrlAfterCreate')}
						</p>
					{:else}
						<p class="text-xs text-muted-foreground">
							{$t('stacks.gitModal.webhookConfigureHelp')}
						</p>
					{/if}
				{/if}
			</div>

			<!-- Deploy options section -->
			<div class="space-y-3 p-3 bg-muted/50 rounded-md">
				<p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{$t('stacks.gitModal.deployOptions')}</p>
				<div class="flex items-center gap-3">
					<div class="flex items-center gap-2 flex-1">
						<Hammer class="w-4 h-4 text-muted-foreground" />
						<Label class="text-sm font-normal">{$t('stacks.gitModal.buildImagesOnDeploy')}</Label>
					</div>
					<TogglePill bind:checked={formBuildOnDeploy} />
				</div>
				<p class="text-xs text-muted-foreground">
					{$t('stacks.gitModal.buildImagesOnDeployHelp')}
				</p>
				{#if formBuildOnDeploy}
				<div class="flex items-center gap-3 ml-6">
					<div class="flex items-center gap-2 flex-1">
						<Ban class="w-4 h-4 text-muted-foreground" />
						<Label class="text-sm font-normal">{$t('stacks.gitModal.disableBuildCache')}</Label>
					</div>
					<TogglePill bind:checked={formNoBuildCache} />
				</div>
				<p class="text-xs text-muted-foreground ml-6">
					{$t('stacks.gitModal.disableBuildCacheHelp')}
				</p>
				{/if}
				<div class="flex items-center gap-3">
					<div class="flex items-center gap-2 flex-1">
						<ArrowDownToLine class="w-4 h-4 text-muted-foreground" />
						<Label class="text-sm font-normal">{$t('stacks.gitModal.repullImages')}</Label>
					</div>
					<TogglePill bind:checked={formRepullImages} />
				</div>
				<p class="text-xs text-muted-foreground">
					{$t('stacks.gitModal.repullImagesHelp')}
				</p>
				<div class="flex items-center gap-3">
					<div class="flex items-center gap-2 flex-1">
						<Zap class="w-4 h-4 text-muted-foreground" />
						<Label class="text-sm font-normal">{$t('stacks.gitModal.forceRedeployment')}</Label>
					</div>
					<TogglePill bind:checked={formForceRedeploy} />
				</div>
				<p class="text-xs text-muted-foreground">
					{$t('stacks.gitModal.forceRedeploymentHelp')}
				</p>
			</div>

			<!-- Deploy now option (only for new stacks) -->
			{#if !gitStack}
				<div class="space-y-3 p-3 bg-muted/50 rounded-md">
					<div class="flex items-center gap-3">
						<div class="flex items-center gap-2 flex-1">
							<Rocket class="w-4 h-4 text-muted-foreground" />
							<div class="flex-1">
								<Label class="text-sm font-normal">{$t('stacks.gitModal.deployNow')}</Label>
								<p class="text-xs text-muted-foreground">{$t('stacks.gitModal.deployNowHelp')}</p>
							</div>
						</div>
						<TogglePill bind:checked={formDeployNow} />
					</div>
				</div>
			{/if}

			{#if formError}
				<p class="text-sm text-destructive">{formError}</p>
			{/if}
				</div>
			</div>

			<!-- Resizable divider -->
			<div
				class="w-1 flex-shrink-0 bg-zinc-200 dark:bg-zinc-700 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-col-resize transition-colors flex items-center justify-center group {isDraggingSplit ? 'bg-blue-500 dark:bg-blue-400' : ''}"
				onmousedown={startSplitDrag}
				role="separator"
				aria-orientation="vertical"
				tabindex="0"
			>
				<div class="w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity {isDraggingSplit ? 'opacity-100' : ''}">
					<GripVertical class="w-3 h-3 text-white" />
				</div>
			</div>

			<!-- Right column: Environment Variables -->
			<div class="flex-1 min-w-0 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-800/50">
				<StackEnvVarsPanel
					bind:variables={envVars}
					placeholder={{ key: 'MY_VAR', value: 'value' }}
					infoText={$t('stacks.gitModal.envOverridesInfo')}
					existingSecretKeys={gitStack !== null ? existingSecretKeys : new Set()}
					showInterpolationHint={true}
				>
					{#snippet headerActions()}
						{#if !gitStack}
							<div class="flex items-center gap-0.5">
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onclick={populateEnvVars}
									disabled={populatingEnvVars || (formRepoMode === 'existing' && !formRepositoryId) || (formRepoMode === 'new' && !formNewRepoUrl.trim())}
									class="h-6 text-xs px-2"
								>
									{#if populatingEnvVars}
										<Loader2 class="w-3.5 h-3.5 mr-1 animate-spin" />
										{$t('common.states.loading')}
									{:else}
										<Download class="w-3.5 h-3.5" />
										{$t('stacks.gitModal.populate')}
									{/if}
								</Button>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<HelpCircle class="w-3.5 h-3.5 text-muted-foreground cursor-help" />
									</Tooltip.Trigger>
									<Tooltip.Content>
										<div class="w-64">
											<p class="text-xs">{$t('stacks.gitModal.populateTooltip')}</p>
										</div>
									</Tooltip.Content>
								</Tooltip.Root>
							</div>
						{/if}
					{/snippet}
				</StackEnvVarsPanel>
			</div>
		</div>

		<Dialog.Footer class="px-5 py-2.5 border-t border-zinc-200 dark:border-zinc-700 flex-shrink-0">
			<Button variant="outline" onclick={onClose}>{$t('common.actions.cancel')}</Button>
			{#if gitStack}
				<Button variant="outline" onclick={() => saveGitStack(true)} disabled={formSaving}>
					{#if formSaving}
						<Loader2 class="w-4 h-4 mr-1 animate-spin" />
						{$t('stacks.gitDeploy.deploying')}
					{:else}
						<Rocket class="w-4 h-4" />
						{$t('stacks.gitModal.saveAndDeploy')}
					{/if}
				</Button>
				<Button onclick={() => saveGitStack(false)} disabled={formSaving}>
					{#if formSaving}
						<Loader2 class="w-4 h-4 mr-1 animate-spin" />
						{$t('stacks.gitModal.saving')}
					{:else}
						{$t('stacks.gitModal.saveChanges')}
					{/if}
				</Button>
			{:else}
				<Button onclick={() => saveGitStack(formDeployNow)} disabled={formSaving}>
					{#if formSaving}
						<Loader2 class="w-4 h-4 mr-1 animate-spin" />
						{formDeployNow ? $t('stacks.gitDeploy.deploying') : $t('stacks.gitModal.creating')}
					{:else}
						{formDeployNow ? $t('common.actions.deploy') : $t('common.actions.create')}
					{/if}
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Stack already exists warning dialog -->
<Dialog.Root bind:open={showExistsWarning}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<TriangleAlert class="w-5 h-5 text-amber-500" />
				{$t('stacks.gitModal.existsTitle')}
			</Dialog.Title>
			<Dialog.Description>
				{$t('stacks.gitModal.existsDescription', { name: formStackName })}
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex justify-end mt-4">
			<Button size="sm" onclick={() => showExistsWarning = false}>
				{$t('common.actions.ok')}
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
