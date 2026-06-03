import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authorize } from '$lib/server/authorize';
import { readEnvironmentFile } from '$lib/server/environment-files';

/**
 * GET /api/system/files/content
 * Read file content from the selected environment filesystem.
 *
 * Query params:
 * - path: File path to read
 * - env: Environment ID (optional; Hawser environments read from the agent host)
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
	const auth = await authorize(cookies);

	if (auth.authEnabled && !await auth.can('stacks', 'edit')) {
		return json({ error: 'Permission denied' }, { status: 403 });
	}

	const path = url.searchParams.get('path');
	const envParam = url.searchParams.get('env');
	const envId = envParam ? parseInt(envParam) : undefined;

	if (!path) {
		return json({ error: 'Path is required' }, { status: 400 });
	}

	if (envId && auth.authEnabled && auth.isEnterprise && !await auth.canAccessEnvironment(envId)) {
		return json({ error: 'Access denied to this environment' }, { status: 403 });
	}

	try {
		return json(await readEnvironmentFile(path, envId));
	} catch (error) {
		console.error('Error reading file:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: `Failed to read file: ${message}` }, { status: 500 });
	}
};
