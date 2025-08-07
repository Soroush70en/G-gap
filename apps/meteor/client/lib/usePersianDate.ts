import { toJalaali } from 'jalaali-js';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

import type { IUser } from '@rocket.chat/core-typings';

const weekDaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const monthNamesFa = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

/**
 * هوک تبدیل تاریخ میلادی به شمسی
 * @param date تاریخ JS معمولی (مثلاً new Date())
 * @param verbose اگر true باشد، خروجی نوشتاری می‌دهد (مثلاً: شنبه ۲۸ تیر ۱۴۰۴)
 * @returns string تاریخ شمسی
 */
export const usePersianDate = (date: Date, verbose = false, def: string): string => {
	return _usePersianDate(date, verbose, false, def);
};

export const usePersianDateShort = (date: Date, verbose = false, def: string): string => {
	return _usePersianDate(date, verbose, true, def);
};

const _usePersianDate = (date: Date, verbose = false, short = false, def: string): string => {
	const user: Pick<IUser, 'language' | 'username'> | null = Meteor.user();

	if (user?.language !== 'fa' && user?.language !== '') {
		return def;
	}

	const { jy, jm, jd } = toJalaali(date);
	const pad = (n: number) => n.toString().padStart(2, '0');

	if (verbose) {
		const dayName = TAPi18n.__(weekDaysEn[date.getDay()]);
		const dayDiff = getDaysDifference(date);
		switch (dayDiff) {
			case 0:
				return TAPi18n.__('Today');
			case 1:
				return TAPi18n.__('Yesterday');
			case 2:
			case 3:
			case 4:
			case 5:
			case 6:
				return dayName;
			default:
				break;
		}

		const monthName = monthNamesFa[jm - 1];

		if (short) {
			if (dayDiff <= 365) {
				return `${jd} ${monthName}`;
			}

			return `${dayName} ${jd} ${monthName}`;
		} else {
			if (dayDiff <= 365) {
				return `${dayName} ${jd} ${monthName}`;
			}

			return `${dayName} ${jd} ${monthName} ${jy}`;
		}
	}

	return `${jy}/${pad(jm)}/${pad(jd)}`;
};

const getDaysDifference = (date1: Date): number => {
	const date2 = new Date();
	// تبدیل هر دو تاریخ به تعداد میلی‌ثانیه از تاریخ 1 ژانویه 1970
	const time1 = date1.getTime();
	const time2 = date2.getTime();

	// محاسبه اختلاف به میلی‌ثانیه
	const differenceInMillis = Math.abs(time1 - time2);

	// تبدیل میلی‌ثانیه به روز
	const millisecondsInDay = 1000 * 3600 * 24;
	return Math.floor(differenceInMillis / millisecondsInDay);
};
