import { toJalaali } from 'jalaali-js';

const weekDaysFa = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
const monthNamesFa = [
	'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
	'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

/**
 * هوک تبدیل تاریخ میلادی به شمسی
 * @param date تاریخ JS معمولی (مثلاً new Date())
 * @param verbose اگر true باشد، خروجی نوشتاری می‌دهد (مثلاً: شنبه ۲۸ تیر ۱۴۰۴)
 * @returns string تاریخ شمسی
 */
export const usePersianDate = (date: Date, verbose = false): string => {
	const { jy, jm, jd } = toJalaali(date);
	const pad = (n: number) => n.toString().padStart(2, '0');

	if (verbose) {
		const dayName = weekDaysFa[date.getDay()];
		const monthName = monthNamesFa[jm - 1];
		return `${dayName} ${jd} ${monthName} ${jy}`;
	}

	return `${jy}/${pad(jm)}/${pad(jd)}`;
};
