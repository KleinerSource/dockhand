import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authorize } from '$lib/server/authorize';
import { createEnvironmentDirectory, listEnvironmentDirectory } from '$lib/server/environment-files';

export interface FileEntry {
	name: string;
	path: string;
	type: 'file' | 'directory' | 'symlink';
	size: number;
	mtime: string;
	mode: string;
}

/**
 * POST /api/system/files
 * Create a directory
 *
 * Body: { path: string, env?: number }
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const auth = await authorize(cookies);

	if (auth.authEnabled && !await auth.can('stacks', 'edit')) {
		return json({ error: 'Permission denied' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const path = body.path;
		const envId = body.env ? parseInt(String(body.env)) : undefined;

		if (!path || typeof path !== 'string') {
			return json({ error: 'Path is required' }, { status: 400 });
		}

		if (envId && auth.authEnabled && auth.isEnterprise && !await auth.canAccessEnvironment(envId)) {
			return json({ error: 'Access denied to this environment' }, { status: 403 });
		}

		await createEnvironmentDirectory(path, envId);

		return json({ success: true, path });
	} catch (error) {
		console.error('Error creating directory:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: `Failed to create directory: ${message}` }, { status: 500 });
	}
};

/**
 * GET /api/system/files
 * Browse filesystem for the selected environment.
 *
 * Query params:
 * - path: Directory path to list
 * - env: Environment ID (optional; Hawser environments browse the agent host)
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
	const auth = await authorize(cookies);

	if (auth.authEnabled && !await auth.can('stacks', 'edit')) {
		return json({ error: 'Permission denied' }, { status: 403 });
	}

	const path = url.searchParams.get('path') || '/';
	const envParam = url.searchParams.get('env');
	const envId = envParam ? parseInt(envParam) : undefined;

	try {
		if (envId && auth.authEnabled && auth.isEnterprise && !await auth.canAccessEnvironment(envId)) {
			return json({ error: 'Access denied to this environment' }, { status: 403 });
		}

		return json(await listEnvironmentDirectory(path, envId));
	} catch (error) {
		console.error('Error listing directory:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: `Failed to list directory: ${message}` }, { status: 500 });
	}
};
