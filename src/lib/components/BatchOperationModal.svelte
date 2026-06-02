<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Check, X, Loader2, Circle, Ban } from 'lucide-svelte';
	import { onDestroy } from 'svelte';
	import { formatBytes } from '$lib/utils/format';
	import { t } from '$lib/i18n';

	// Local type definitions (matching server types)
	type ItemStatus = 'pending' | 'processing' | 'success' | 'error' | 'cancelled';

	type BatchEvent =
		| { type: 'start'; total: number }
		| { type: 'progress'; id: string; name: string; status: ItemStatus; message?: string; error?: string; current: number; total: number }
		| { type: 'complete'; summary: { total: number; success: number; failed: number } }
		| { type: 'error'; error: string };

	interface Props {
		open: boolean;
		title: string;
		operation: string;
		entityType: 'containers' | 'images' | 'volumes' | 'networks' | 'stacks';
		items: Array<{ id: string; name: string }>;
		envId?: number;
		options?: Record<string, any>;
		totalSize?: number;
		onClose: () => void;
		onComplete: () => void;
	}

	let {
		open = $bindable(),
		title,
		operation,
		entityType,
		items,
		envId,
		options = {},
		totalSize,
		onClose,
		onComplete
	}: Props = $props();

	// State
	type ItemState = {
		id: string;
		name: string;
		status: ItemStatus;
		error?: string;
	};

	let itemStates = $state<ItemState[]>([]);
	let isRunning = $state(false);
	let isComplete = $state(false);
	let successCount = $state(0);
	let failCount = $state(0);
	let cancelledCount = $state(0);
	let cancelled = false;

	// Progress calculation
	const progress = $derived(() => {
		if (itemStates.length === 0) return 0;
		const completed = itemStates.filter(i => i.status === 'success' || i.status === 'error' || i.status === 'cancelled').length;
		return Math.round((completed / itemStates.length) * 100);
	});

	// Initialize when modal opens
	$effect(() => {
		if (open && items.length > 0 && !isRunning && !isComplete) {
			startOperation();
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		cancelled = true;
	});

	async function startOperation() {
		// Initialize item states
		itemStates = items.map(item => ({
			id: item.id,
			name: item.name,
			status: 'pending' as ItemStatus
		}));

		isRunning = true;
		isComplete = false;
		successCount = 0;
		failCount = 0;
		cancelledCount = 0;
		cancelled = false;

		try {
			const response = await fetch(`/api/batch${envId ? `?env=${envId}` : ''}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ operation, entityType, items, options })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Request failed');
			}

			const data = await response.json();
			const { jobId } = data;

			// Poll job for progress events
			let cursor = 0;
			while (!cancelled) {
				const jobRes = await fetch(`/api/jobs/${jobId}`);
				if (!jobRes.ok) break;
				const job = await jobRes.json();

				// Process new lines since last poll
				const newLines = job.lines.slice(cursor);
				cursor = job.lines.length;
				for (const line of newLines) {
					handleEvent(line.data as BatchEvent);
				}

				if (job.status !== 'running') break;
				await new Promise((r) => setTimeout(r, 500));
			}

			if (cancelled) {
				// Mark remaining items as cancelled
				let cancelCount = 0;
				itemStates = itemStates.map(item => {
					if (item.status === 'pending' || item.status === 'processing') {
						cancelCount++;
						return { ...item, status: 'cancelled' as ItemStatus };
					}
					return item;
				});
				cancelledCount = cancelCount;
			}
		} catch (error: any) {
			console.error('Batch operation error:', error);
		} finally {
			isRunning = false;
			isComplete = true;
		}
	}

	function handleEvent(event: BatchEvent) {
		switch (event.type) {
			case 'progress':
				itemStates = itemStates.map(item =>
					item.id === event.id
						? { ...item, status: event.status, error: event.error }
						: item
				);
				if (event.status === 'success') successCount++;
				if (event.status === 'error') failCount++;
				break;
			case 'complete':
				successCount = event.summary.success;
				failCount = event.summary.failed;
				break;
		}
	}

	function handleCancel() {
		cancelled = true;
	}

	function handleClose() {
		if (isRunning) {
			// Confirm before closing during operation
			if (!confirm($t('batchOperation.runningCloseConfirm'))) {
				return;
			}
			handleCancel();
		}
		open = false;
		// Reset state for next use
		itemStates = [];
		isRunning = false;
		isComplete = false;
		successCount = 0;
		failCount = 0;
		cancelledCount = 0;
		onClose();
		if (isComplete) {
			onComplete();
		}
	}

	function handleOk() {
		open = false;
		itemStates = [];
		isRunning = false;
		isComplete = false;
		successCount = 0;
		failCount = 0;
		cancelledCount = 0;
		onClose();
		onComplete();
	}

	function getEntityTypeLabel(): string {
		switch (entityType) {
			case 'containers':
				return $t('common.labels.containers');
			case 'images':
				return $t('common.labels.images');
			case 'volumes':
				return $t('common.labels.volumes');
			case 'networks':
				return $t('common.labels.networks');
			case 'stacks':
				return $t('common.labels.stacks');
			default:
				return entityType;
		}
	}

	function getOperationLabel(): string {
		switch (operation) {
			case 'remove':
				return $t('batchOperation.operations.remove');
			case 'start':
				return $t('batchOperation.operations.start');
			case 'stop':
				return $t('batchOperation.operations.stop');
			case 'restart':
				return $t('batchOperation.operations.restart');
			case 'down':
				return $t('batchOperation.operations.down');
			default:
				return operation;
		}
	}

	function getProcessingLabel(): string {
		switch (operation) {
			case 'remove':
				return $t('batchOperation.operations.removing');
			case 'start':
				return $t('batchOperation.operations.starting');
			case 'stop':
			case 'down':
				return $t('batchOperation.operations.stopping');
			case 'restart':
				return $t('batchOperation.operations.restarting');
			default:
				return operation;
		}
	}

	function getCompleteDescription(): string {
		let description = $t('batchOperation.completedSummary', { success: successCount });
		if (failCount > 0) {
			description += $t('batchOperation.failedSuffix', { count: failCount });
		}
		if (cancelledCount > 0) {
			description += $t('batchOperation.cancelledSuffix', { count: cancelledCount });
		}
		if (totalSize && successCount > 0) {
			description += ` (${formatBytes(totalSize)})`;
		}
		return description;
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<Dialog.Content class="w-full max-w-lg" onInteractOutside={(e) => isRunning && e.preventDefault()}>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>
				{#if isRunning}
					{$t('batchOperation.processingItems', { count: items.length, entity: getEntityTypeLabel() })}
				{:else if isComplete}
					{getCompleteDescription()}
				{:else}
					{$t('batchOperation.preparingItems', { operation: getOperationLabel(), count: items.length, entity: getEntityTypeLabel() })}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<!-- Progress bar -->
		<div class="py-2">
			<Progress value={progress()} class="h-2" />
			<div class="text-xs text-muted-foreground mt-1 text-right">
				{progress()}%
			</div>
		</div>

		<!-- Items list -->
		<div class="max-h-80 overflow-y-auto border rounded-md">
			{#each itemStates as item (item.id)}
				<div class="px-3 py-2 border-b last:border-b-0 text-sm {item.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' : ''} {item.status === 'cancelled' ? 'bg-amber-50 dark:bg-amber-950/20' : ''}">
					<div class="flex items-center gap-2">
						<!-- Status icon -->
						<div class="w-5 h-5 flex items-center justify-center flex-shrink-0">
							{#if item.status === 'pending'}
								<Circle class="w-4 h-4 text-muted-foreground" />
							{:else if item.status === 'processing'}
								<Loader2 class="w-4 h-4 text-blue-500 animate-spin" />
							{:else if item.status === 'success'}
								<Check class="w-4 h-4 text-green-500" />
							{:else if item.status === 'error'}
								<X class="w-4 h-4 text-red-500" />
							{:else if item.status === 'cancelled'}
								<Ban class="w-4 h-4 text-amber-500" />
							{/if}
						</div>

						<!-- Item name -->
						<span class="flex-1 truncate font-mono text-xs" title={item.name}>
							{item.name}
						</span>

						<!-- Status text -->
						<span class="text-xs text-muted-foreground flex-shrink-0">
							{#if item.status === 'pending'}
								{$t('batchOperation.pending')}
							{:else if item.status === 'processing'}
								{getProcessingLabel()}...
							{:else if item.status === 'success'}
								{$t('batchOperation.done')}
							{:else if item.status === 'error'}
								<span class="text-red-500">{$t('batchOperation.failed')}</span>
							{:else if item.status === 'cancelled'}
								<span class="text-amber-500">{$t('batchOperation.cancelled')}</span>
							{/if}
						</span>
					</div>
					<!-- Error message on separate line -->
					{#if item.status === 'error' && item.error}
						<div class="mt-1 ml-7 text-xs text-red-600 dark:text-red-400 break-words">
							{item.error}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Footer: Summary + Button in one row -->
		<div class="flex items-center justify-between pt-2">
			<div class="flex items-center gap-3 text-sm">
				<div class="flex items-center gap-1" title={$t('batchOperation.succeeded')}>
					<Check class="w-4 h-4 text-green-500" />
					<span class="tabular-nums">{successCount}</span>
				</div>
				<div class="flex items-center gap-1" title={$t('batchOperation.failed')}>
					<X class="w-4 h-4 text-red-500" />
					<span class="tabular-nums">{failCount}</span>
				</div>
				<div class="flex items-center gap-1" title={$t('batchOperation.cancelled')}>
					<Ban class="w-4 h-4 text-amber-500" />
					<span class="tabular-nums">{cancelledCount}</span>
				</div>
				<div class="flex items-center gap-1 text-muted-foreground" title={$t('batchOperation.pending')}>
					<Circle class="w-4 h-4" />
					<span class="tabular-nums">{items.length - successCount - failCount - cancelledCount}</span>
				</div>
			</div>
			{#if isRunning}
				<Button variant="outline" size="sm" onclick={handleCancel}>
					{$t('batchOperation.cancel')}
				</Button>
			{:else}
				<Button size="sm" onclick={handleOk}>
					{$t('common.actions.ok')}
				</Button>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
