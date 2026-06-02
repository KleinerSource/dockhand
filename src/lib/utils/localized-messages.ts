import type { TranslationParams } from '$lib/i18n';

type TranslateFn = (key: string, params?: TranslationParams) => string;

const containerStatusKeys = new Set(['running', 'paused', 'restarting', 'exited', 'created', 'dead', 'removing']);

export function getContainerStatusLabelKey(state: string | null | undefined): string {
	const normalized = state?.toLowerCase() ?? '';
	return containerStatusKeys.has(normalized) ? `containers.status.${normalized}` : 'common.states.unknown';
}

export function formatContainerStatus(state: string | null | undefined, t: TranslateFn): string {
	return t(getContainerStatusLabelKey(state));
}

function formatPrefixedMessage(message: string, prefix: string, key: string, t: TranslateFn): string | null {
	if (!message.startsWith(prefix)) return null;
	return t(key, { error: message.slice(prefix.length) });
}

export function formatUpdateMessage(message: string | null | undefined, t: TranslateFn): string {
	if (!message) return '';

	switch (message) {
		case 'Container not found':
			return t('updateMessages.errors.containerNotFound');
		case 'Could not determine image name':
			return t('updateMessages.errors.couldNotDetermineImageName');
		case 'Failed to get new image ID after pull':
			return t('updateMessages.errors.failedToGetNewImageId');
		case 'Container recreation failed':
			return t('updateMessages.errors.containerRecreationFailed');
		case 'Skipped by dockhand.update=false label':
			return t('updateMessages.reasons.skippedByLabel');
		case 'Image pinned to specific digest':
			return t('updateMessages.reasons.imagePinnedToDigest');
		case 'Local image - no registry available':
			return t('updateMessages.reasons.localImageNoRegistry');
		case 'Already up-to-date':
			return t('updateMessages.reasons.alreadyUpToDate');
		case 'Cannot auto-update Dockhand itself':
			return t('updateMessages.reasons.cannotAutoUpdateDockhand');
		case 'Cannot auto-update Hawser agent':
			return t('updateMessages.reasons.cannotAutoUpdateHawser');
		default:
			break;
	}

	return (
		formatPrefixedMessage(message, 'Pull failed: ', 'updateMessages.errors.pullFailed', t) ??
		formatPrefixedMessage(message, 'Failed to pull image: ', 'updateMessages.errors.pullFailed', t) ??
		formatPrefixedMessage(message, 'Scan failed: ', 'updateMessages.errors.scanFailed', t) ??
		formatPrefixedMessage(message, 'Vulnerability scan failed: ', 'updateMessages.errors.vulnerabilityScanFailed', t) ??
		formatPrefixedMessage(message, 'Registry check failed: ', 'updateMessages.errors.registryCheckFailed', t) ??
		message
	);
}

export function formatUpdateBlockReason(reason: string | null | undefined, t: TranslateFn): string {
	if (!reason) return '';

	let match = reason.match(/^Found (\d+) vulnerabilities \((\d+) critical, (\d+) high, (\d+) medium, (\d+) low\)$/);
	if (match) {
		return t('updateMessages.blockReasons.any', {
			total: match[1],
			critical: match[2],
			high: match[3],
			medium: match[4],
			low: match[5]
		});
	}

	match = reason.match(/^Found (\d+) critical and (\d+) high severity vulnerabilities$/);
	if (match) {
		return t('updateMessages.blockReasons.criticalHigh', {
			critical: match[1],
			high: match[2]
		});
	}

	match = reason.match(/^Found (\d+) critical vulnerabilities$/);
	if (match) {
		return t('updateMessages.blockReasons.critical', { critical: match[1] });
	}

	match = reason.match(/^New image has (\d+) vulnerabilities vs (\d+) in current image$/);
	if (match) {
		return t('updateMessages.blockReasons.moreThanCurrent', {
			total: match[1],
			current: match[2]
		});
	}

	return formatUpdateMessage(reason, t);
}

export function formatBatchOperationError(error: string | null | undefined, t: TranslateFn): string {
	if (!error) return '';

	switch (error) {
		case 'Invalid JSON body':
			return t('batchOperation.errors.invalidJsonBody');
		case 'items array is required and must not be empty':
			return t('batchOperation.errors.itemsRequired');
		case 'Permission denied':
			return t('batchOperation.errors.permissionDenied');
		case 'Access denied to this environment':
			return t('batchOperation.errors.environmentAccessDenied');
		case 'Unknown error':
			return t('common.errors.unknown');
		case 'Failed to start stack':
			return t('batchOperation.errors.failedToStartStack');
		case 'Failed to stop stack':
			return t('batchOperation.errors.failedToStopStack');
		case 'Failed to restart stack':
			return t('batchOperation.errors.failedToRestartStack');
		case 'Failed to down stack':
			return t('batchOperation.errors.failedToDownStack');
		case 'Failed to remove stack':
			return t('batchOperation.errors.failedToRemoveStack');
		default:
			break;
	}

	let match = error.match(/^Invalid entity type: (.+)\. Supported: (.+)$/);
	if (match) {
		return t('batchOperation.errors.invalidEntityType', { entityType: match[1], supported: match[2] });
	}

	match = error.match(/^Invalid operation '(.+)' for (.+)\. Supported: (.+)$/);
	if (match) {
		return t('batchOperation.errors.invalidOperation', { operation: match[1], entityType: match[2], supported: match[3] });
	}

	match = error.match(/^Unsupported (entity type|container operation|image operation|volume operation|network operation|stack operation): (.+)$/);
	if (match) {
		return t('batchOperation.errors.unsupportedOperation', { type: match[1], value: match[2] });
	}

	return formatUpdateMessage(error, t);
}

export function formatStackScanError(error: string | null | undefined, t: TranslateFn): string {
	if (!error) return '';

	switch (error) {
		case 'Path does not exist':
			return t('settings.general.scanResults.errorMessages.pathDoesNotExist');
		case 'Path is not a directory':
			return t('settings.general.scanResults.errorMessages.pathIsNotDirectory');
		case 'Cannot access path':
			return t('settings.general.scanResults.errorMessages.cannotAccessPath');
		case 'Already adopted':
			return t('settings.general.scanResults.alreadyAdopted');
		case 'Unknown error':
			return t('common.errors.unknown');
		default:
			return error;
	}
}
