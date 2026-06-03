import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join } from 'node:path';
import { dockerFetch } from './docker';
import { getEnvironment } from './db';

export interface EnvironmentFileEntry {
	name: string;
	path: string;
	type: 'file' | 'directory' | 'symlink';
	size: number;
	mtime: string;
	mode: string;
}

export interface EnvironmentDirectoryListing {
	path: string;
	parent: string | null;
	entries: EnvironmentFileEntry[];
}

export interface EnvironmentFileContent {
	path: string;
	content: string;
	size: number;
	mtime: string;
}

async function usesHawserFilesystem(envId?: number | null): Promise<boolean> {
	if (!envId) return false;
	const env = await getEnvironment(envId);
	return env?.connectionType === 'hawser-edge' || env?.connectionType === 'hawser-standard';
}

function validatePath(path: string): void {
	if (!path || typeof path !== 'string') {
		throw new Error('Path is required');
	}
	if (path.includes('..')) {
		throw new Error('Path must not contain ..');
	}
}

async function readJsonResponse<T>(response: Response): Promise<T> {
	let data: any;
	try {
		data = await response.json();
	} catch {
		data = {};
	}

	if (!response.ok) {
		throw new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
	}

	return data as T;
}

async function hawserFileRequest<T>(
	envId: number,
	action: 'list' | 'read' | 'write' | 'mkdir' | 'delete',
	body: Record<string, unknown>
): Promise<T> {
	const response = await dockerFetch(
		`/_hawser/files/${action}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		},
		envId
	);
	return readJsonResponse<T>(response);
}

export async function listEnvironmentDirectory(
	path: string,
	envId?: number | null
): Promise<EnvironmentDirectoryListing> {
	validatePath(path);

	if (await usesHawserFilesystem(envId)) {
		return hawserFileRequest<EnvironmentDirectoryListing>(envId!, 'list', { path });
	}

	if (!existsSync(path)) {
		throw new Error(`Path not found: ${path}`);
	}

	const stat = statSync(path);
	if (!stat.isDirectory()) {
		throw new Error(`Not a directory: ${path}`);
	}

	const entries: EnvironmentFileEntry[] = [];
	const dirEntries = readdirSync(path, { withFileTypes: true });

	for (const entry of dirEntries) {
		try {
			const fullPath = join(path, entry.name);
			const entryStat = statSync(fullPath);
			entries.push({
				name: entry.name,
				path: fullPath,
				type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file',
				size: entryStat.size,
				mtime: entryStat.mtime.toISOString(),
				mode: (entryStat.mode & 0o777).toString(8).padStart(3, '0')
			});
		} catch {
			// Skip entries we can't stat.
		}
	}

	entries.sort((a, b) => {
		if (a.type === 'directory' && b.type !== 'directory') return -1;
		if (a.type !== 'directory' && b.type === 'directory') return 1;
		return a.name.localeCompare(b.name);
	});

	return {
		path,
		parent: path === '/' ? null : join(path, '..'),
		entries
	};
}

export async function readEnvironmentFile(
	path: string,
	envId?: number | null
): Promise<EnvironmentFileContent> {
	validatePath(path);

	if (await usesHawserFilesystem(envId)) {
		return hawserFileRequest<EnvironmentFileContent>(envId!, 'read', { path });
	}

	if (!existsSync(path)) {
		throw new Error(`File not found: ${path}`);
	}

	const stat = statSync(path);
	if (stat.isDirectory()) {
		throw new Error(`Cannot read directory as file: ${path}`);
	}

	const maxSize = 10 * 1024 * 1024;
	if (stat.size > maxSize) {
		throw new Error(`File too large (max ${maxSize / 1024 / 1024}MB)`);
	}

	return {
		path,
		content: readFileSync(path, 'utf-8'),
		size: stat.size,
		mtime: stat.mtime.toISOString()
	};
}

export async function writeEnvironmentFile(
	path: string,
	content: string,
	envId?: number | null
): Promise<void> {
	validatePath(path);

	if (await usesHawserFilesystem(envId)) {
		await hawserFileRequest<{ success: boolean; path: string }>(envId!, 'write', { path, content });
		return;
	}

	writeFileSync(path, content);
}

export async function createEnvironmentDirectory(
	path: string,
	envId?: number | null
): Promise<void> {
	validatePath(path);

	if (await usesHawserFilesystem(envId)) {
		await hawserFileRequest<{ success: boolean; path: string }>(envId!, 'mkdir', { path });
		return;
	}

	if (!isAbsolute(path)) {
		throw new Error('Path must be absolute');
	}

	if (existsSync(path)) {
		throw new Error('Path already exists');
	}

	mkdirSync(path, { recursive: true });
}

export async function removeEnvironmentFile(
	path: string,
	envId?: number | null
): Promise<void> {
	validatePath(path);

	if (await usesHawserFilesystem(envId)) {
		await hawserFileRequest<{ success: boolean; path: string }>(envId!, 'delete', { path });
		return;
	}

	if (existsSync(path)) {
		rmSync(path);
	}
}

export function getEnvFilePathForCompose(composePath: string): string {
	return composePath.replace(/\/[^/]+$/, '/.env');
}

export function getPathBaseName(path: string): string {
	return basename(path.replace(/\/$/, ''));
}
