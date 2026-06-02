import cronstrue from 'cronstrue';
import 'cronstrue/locales/zh_CN';
import type { Locale, TranslationParams } from '$lib/i18n';

type TranslateFn = (key: string, params?: TranslationParams) => string;

const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const dayAliases: Record<string, (typeof dayKeys)[number]> = {
	'0': 'sunday',
	'7': 'sunday',
	sun: 'sunday',
	sunday: 'sunday',
	'1': 'monday',
	mon: 'monday',
	monday: 'monday',
	'2': 'tuesday',
	tue: 'tuesday',
	tuesday: 'tuesday',
	'3': 'wednesday',
	wed: 'wednesday',
	wednesday: 'wednesday',
	'4': 'thursday',
	thu: 'thursday',
	thursday: 'thursday',
	'5': 'friday',
	fri: 'friday',
	friday: 'friday',
	'6': 'saturday',
	sat: 'saturday',
	saturday: 'saturday'
};

function isSimpleNumber(value: string): boolean {
	return /^\d+$/.test(value);
}

function normalizeCronParts(parts: string[]): string[] | null {
	if (parts.length === 5) return parts;
	if (parts.length === 6 && parts[0] === '0') return parts.slice(1);
	return null;
}

function formatTime(hour: string, minute: string, is12Hour: boolean): string | null {
	if (!isSimpleNumber(hour) || !isSimpleNumber(minute)) return null;

	const hourNum = Number(hour);
	const minuteNum = Number(minute);
	if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) return null;

	if (!is12Hour) {
		return `${hourNum.toString().padStart(2, '0')}:${minuteNum.toString().padStart(2, '0')}`;
	}

	const ampm = hourNum >= 12 ? 'PM' : 'AM';
	const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
	return `${hour12}:${minuteNum.toString().padStart(2, '0')} ${ampm}`;
}

function getSingleDayKey(dayOfWeek: string): (typeof dayKeys)[number] | null {
	if (dayOfWeek.includes(',') || dayOfWeek.includes('-') || dayOfWeek.includes('/')) return null;
	return dayAliases[dayOfWeek.toLowerCase()] ?? null;
}

function getDayKeys(dayOfWeek: string): (typeof dayKeys)[number][] | null {
	if (dayOfWeek === '*' || dayOfWeek.includes('/')) return null;

	const rangeMatch = dayOfWeek.match(/^([A-Za-z0-9]+)-([A-Za-z0-9]+)$/);
	if (rangeMatch) {
		const startKey = dayAliases[rangeMatch[1].toLowerCase()];
		const endKey = dayAliases[rangeMatch[2].toLowerCase()];
		if (!startKey || !endKey) return null;

		const start = dayKeys.indexOf(startKey);
		const end = dayKeys.indexOf(endKey);
		if (start === -1 || end === -1 || start > end) return null;
		return dayKeys.slice(start, end + 1);
	}

	const keys = dayOfWeek.split(',').map((part) => dayAliases[part.toLowerCase()]);
	if (!keys.every((key): key is (typeof dayKeys)[number] => Boolean(key))) return null;
	return [...new Set(keys)];
}

function formatDayList(dayKeysToFormat: (typeof dayKeys)[number][], options: { locale: Locale; t: TranslateFn }): string {
	const dayNames = dayKeysToFormat.map((dayKey) => options.t(`cron.days.${dayKey}`));
	return new Intl.ListFormat(options.locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
		style: 'long',
		type: 'conjunction'
	}).format(dayNames);
}

function getEveryMinutes(minute: string): number | null {
	const match = minute.match(/^\*\/(\d+)$/);
	if (!match) return null;

	const count = Number(match[1]);
	return count > 0 ? count : null;
}

export function formatCronDescription(
	cronExpression: string,
	options: {
		is12Hour: boolean;
		locale: Locale;
		t: TranslateFn;
	}
): string {
	const cron = cronExpression.trim();
	const parts = normalizeCronParts(cron.split(/\s+/));

	if (parts) {
		const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
		const time = formatTime(hour, minute, options.is12Hour);

		if (hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
			const everyMinutes = getEveryMinutes(minute);
			if (everyMinutes === 1) return options.t('cron.descriptions.everyMinute');
			if (everyMinutes) return options.t('cron.descriptions.everyMinutes', { count: everyMinutes });
		}

		if (time && dayOfMonth === '*' && month === '*') {
			if (dayOfWeek === '*') {
				return options.t('cron.descriptions.dailyAt', { time });
			}

			const dayKey = getSingleDayKey(dayOfWeek);
			if (dayKey) {
				return options.t('cron.descriptions.weeklyAt', {
					day: options.t(`cron.days.${dayKey}`),
					time
				});
			}

			const listedDayKeys = getDayKeys(dayOfWeek);
			if (listedDayKeys) {
				return options.t('cron.descriptions.onlyOnDaysAt', {
					days: formatDayList(listedDayKeys, options),
					time
				});
			}
		}
	}

	return cronstrue.toString(cronExpression, {
		use24HourTimeFormat: !options.is12Hour,
		throwExceptionOnParseError: true,
		locale: options.locale === 'zh-CN' ? 'zh_CN' : 'en'
	});
}
