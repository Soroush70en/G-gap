import { toJalaali } from 'jalaali-js';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

const weekDaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const monthNamesFa = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

/**
 * هوک تبدیل تاریخ میلادی به شمسی
 * @param date تاریخ JS معمولی (مثلاً new Date())
 * @param verbose اگر true باشد، خروجی نوشتاری می‌دهد (مثلاً: شنبه ۲۸ تیر ۱۴۰۴)
 * @returns string تاریخ شمسی
 */

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
}

export const usePersianDate = (date: Date, verbose = false, short = false, showTime = false, showSecond = false): string => {	
	try{
		let time = '';
		let jy, jm, jd;
		try{
			 let d = toJalaali(date);
			 jy = d.jy;
			 jm = d.jm;
			 jd = d.jd;
		}
		catch (ex){
			// تبدیل به تاریخ محلی کاربر
			date = new Date(date.toLocaleString());
		
			// تبدیل به تاریخ جلالی
			const d = toJalaali(date);
			 jy = d.jy;
			 jm = d.jm;
			 jd = d.jd;
		}

		const pad = (n: number) => n.toString().padStart(2, '0');

		if(showTime){
			time =  date.getHours() + ':' + date.getMinutes();

			if(showSecond)
			time += ':' + date.getSeconds();

			time += String.fromCharCode(32);
		}

		let finalDate='';
		if (verbose) {
			const dayName = TAPi18n.__(weekDaysEn[date.getDay()]);
			const dayDiff = getDaysDifference(date);
			
			switch (dayDiff)
			{
				case 0:
					return TAPi18n.__('Today');				
				case 1:
					return TAPi18n.__('Yesterday');
				case 2:	case 3:	case 4:	case 5: case 6:
					return dayName;			
				default:				
					break;									
			}

			const monthName = monthNamesFa[jm - 1];

			if(short){
				if(dayDiff <=365){
					finalDate = `${time}${jd} ${monthName}`;
				}
				else
				{
					finalDate = `${time}${dayName} ${jd} ${monthName}`;
				}
			}
			else{
				if(dayDiff <=365){
					finalDate = `${time}${dayName} ${jd} ${monthName}`;
				}
				else{
					finalDate = `${time}${dayName} ${jd} ${monthName} ${jy}`;
				}
			}
		}	
		else{
			finalDate = `${time}${jy}/${pad(jm)}/${pad(jd)}`;
		}

		try{
			finalDate = finalDate.replace(/\d/g, (match) => '۰۱۲۳۴۵۶۷۸۹'[match]);
		}
		catch{}

		return finalDate
	
	}
	catch(ex)
	{
		console.log(ex);
		return '';
	}
}
