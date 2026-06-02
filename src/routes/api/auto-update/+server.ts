import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAutoUpdateSetting,
	getAutoUpdateSettings,
	upsertAutoUpdateSetting,
	deleteAutoUpdateSchedule,
	type VulnerabilityCriteria
} from '$lib/server/db';
import { authorize } from '$lib/server/authorize';
import { registerSchedule, unregisterSchedule } from '$lib/server/scheduler';
import { isValidCron } from '$lib/server/scheduler/cron-utils';

function detectScheduleType(cronExpression: string): 'daily' | 'weekly' | 'custom' {
	const parts = cronExpression.trim().split(/\s+/);
	if (parts.length !== 5) return 'custom';

	const [, , day, month, dow] = parts;
	if (dow !== '*' && day === '*' && month === '*') {
		return 'weekly';
	}
	if (day === '*' && month === '*' && dow === '*') {
		return 'daily';
	}
	return 'custom';
}

function normalizeCriteria(value: unknown): VulnerabilityCriteria {
	const allowed: VulnerabilityCriteria[] = ['never', 'any', 'critical_high', 'critical', 'more_than_current'];
	return typeof value === 'string' && allowed.includes(value as VulnerabilityCriteria)
		? (value as VulnerabilityCriteria)
		: 'never';
}

/**
 * Batch endpoint to get all auto-update settings for an environment.
 * Returns a map of containerName -> settings for efficient lookup.
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const envIdParam = url.searchParams.get('env');
		const envId = envIdParam ? parseInt(envIdParam) : undefined;

		const settings = await getAutoUpdateSettings(envId);

		// Convert to a map keyed by container name for efficient frontend lookup
		const settingsMap: Record<string, {
			enabled: boolean;
			scheduleType: string;
			cronExpression: string | null;
			vulnerabilityCriteria: string;
		}> = {};

		for (const setting of settings) {
			if (setting.enabled) {
				settingsMap[setting.containerName] = {
					enabled: setting.enabled,
					scheduleType: setting.scheduleType,
					cronExpression: setting.cronExpression,
					vulnerabilityCriteria: setting.vulnerabilityCriteria || 'never'
				};
			}
		}

		return json(settingsMap);
	} catch (error) {
		console.error('Failed to get auto-update settings:', error);
		return json({ error: 'Failed to get auto-update settings' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ url, request, cookies }) => {
	const auth = await authorize(cookies);
	if (auth.authEnabled && !await auth.can('schedules', 'edit')) {
		return json({ error: 'Permission denied' }, { status: 403 });
	}

	try {
		const envIdParam = url.searchParams.get('env');
		const envId = envIdParam ? parseInt(envIdParam) : undefined;
		const body = await request.json();
		const enabled = body.enabled === true;
		const rawContainerNames = Array.isArray(body.containerNames) ? body.containerNames : [];
		const containerNames = [...new Set(
			rawContainerNames.filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
		)];

		if (containerNames.length === 0) {
			return json({ error: 'No containers selected' }, { status: 400 });
		}

		if (!enabled) {
			for (const containerName of containerNames) {
				const setting = await getAutoUpdateSetting(containerName, envId);
				await deleteAutoUpdateSchedule(containerName, envId);
				if (setting?.id) {
					unregisterSchedule(setting.id, 'container_update');
				}
			}

			return json({ success: true, enabled: false, updated: containerNames.length });
		}

		const cronExpression = typeof body.cronExpression === 'string' ? body.cronExpression.trim() : '';
		if (!cronExpression || !isValidCron(cronExpression)) {
			return json({ error: 'Invalid cron expression' }, { status: 400 });
		}

		const scheduleType = detectScheduleType(cronExpression);
		const vulnerabilityCriteria = normalizeCriteria(body.vulnerabilityCriteria);

		for (const containerName of containerNames) {
			const setting = await upsertAutoUpdateSetting(
				containerName,
				{
					enabled: true,
					scheduleType,
					cronExpression,
					vulnerabilityCriteria
				},
				envId
			);
			await registerSchedule(setting.id, 'container_update', setting.environmentId);
		}

		return json({ success: true, enabled: true, updated: containerNames.length });
	} catch (error) {
		console.error('Failed to save batch auto-update settings:', error);
		return json({ error: 'Failed to save batch auto-update settings' }, { status: 500 });
	}
};
