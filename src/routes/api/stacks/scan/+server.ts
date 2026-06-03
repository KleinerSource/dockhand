import { json, type RequestHandler } from '@sveltejs/kit';
import { authorize } from '$lib/server/authorize';
import { scanExternalPaths, scanPaths, detectRunningStacks } from '$lib/server/stack-scanner';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const auth = await authorize(cookies);
	if (auth.authEnabled && !await auth.can('stacks', 'create')) {
		return json({ error: 'Permission denied' }, { status: 403 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const { path, env, filesystem } = body;
		const envId = env ? parseInt(String(env)) : undefined;
		const fileSource = filesystem === 'environment' ? 'environment' : 'dockhand';

		if (envId && auth.authEnabled && auth.isEnterprise && !await auth.canAccessEnvironment(envId)) {
			return json({ error: 'Access denied to this environment' }, { status: 403 });
		}

		let result;
		if (path) {
			// Scan a specific path provided by the user
			result = await scanPaths([path], envId, fileSource);
		} else {
			// Scan all configured external paths (legacy behavior)
			result = await scanExternalPaths();
		}

		// Detect which stacks are already running on any environment
		const discoveredWithRunning = await detectRunningStacks(result.discovered);
		discoveredWithRunning.sort((a, b) => a.name.localeCompare(b.name));

		return json({
			...result,
			discovered: discoveredWithRunning
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
