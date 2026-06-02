import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

type TranslationTree = Record<string, unknown>;
export type TranslationParams = Record<string, string | number | boolean | null | undefined>;

export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

const STORAGE_KEY = 'dockhand-language';
const dictionaries: Record<Locale, TranslationTree> = {
	en,
	'zh-CN': zhCN
};

export const localeOptions: Array<{ value: Locale; labelKey: string }> = [
	{ value: 'en', labelKey: 'language.english' },
	{ value: 'zh-CN', labelKey: 'language.simplifiedChinese' }
];

function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: unknown): Locale {
	if (isLocale(value)) return value;
	if (typeof value !== 'string') return DEFAULT_LOCALE;

	const normalized = value.toLowerCase();
	if (normalized.startsWith('zh')) return 'zh-CN';
	if (normalized.startsWith('en')) return 'en';
	return DEFAULT_LOCALE;
}

function getInitialLocale(): Locale {
	if (!browser) return DEFAULT_LOCALE;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) return normalizeLocale(stored);
	} catch {
		// Ignore storage failures and fall back to browser language.
	}

	return normalizeLocale(navigator.language);
}

function getValue(locale: Locale, key: string): unknown {
	let current: unknown = dictionaries[locale];

	for (const part of key.split('.')) {
		if (!current || typeof current !== 'object' || !(part in current)) return undefined;
		current = (current as TranslationTree)[part];
	}

	return current;
}

function getMessage(locale: Locale, key: string): string | undefined {
	const current = getValue(locale, key);
	return typeof current === 'string' ? current : undefined;
}

function interpolate(message: string, params?: TranslationParams): string {
	if (!params) return message;
	return message.replace(/\{(\w+)\}/g, (match, name) => {
		const value = params[name];
		return value === null || value === undefined ? match : String(value);
	});
}

const initialLocale = getInitialLocale();
const localeStore = writable<Locale>(initialLocale);
let currentLocale = initialLocale;

localeStore.subscribe((nextLocale) => {
	currentLocale = nextLocale;

	if (!browser) return;
	document.documentElement.lang = nextLocale;
	try {
		localStorage.setItem(STORAGE_KEY, nextLocale);
	} catch {
		// Language still updates in memory if localStorage is unavailable.
	}
});

export const locale = {
	subscribe: localeStore.subscribe,
	set(value: unknown) {
		localeStore.set(normalizeLocale(value));
	},
	init(value?: unknown) {
		localeStore.set(value ? normalizeLocale(value) : getInitialLocale());
	}
};

export const t = derived(localeStore, ($locale) => {
	return (key: string, params?: TranslationParams) => translate(key, params, $locale);
});

export function translate(key: string, params?: TranslationParams, targetLocale: Locale = currentLocale): string {
	const message = getMessage(targetLocale, key) ?? getMessage(DEFAULT_LOCALE, key);
	return interpolate(message ?? key, params);
}

export function translateStringArray(key: string, targetLocale: Locale = currentLocale): string[] {
	const value = getValue(targetLocale, key) ?? getValue(DEFAULT_LOCALE, key);
	return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : [];
}

export function getCurrentLocale(): Locale {
	return currentLocale;
}

export function getIntlLocale(targetLocale: Locale = currentLocale): string {
	return targetLocale === 'zh-CN' ? 'zh-CN' : 'en-US';
}

export function formatNumber(value: number, targetLocale: Locale = currentLocale): string {
	return new Intl.NumberFormat(getIntlLocale(targetLocale)).format(value);
}
