import type {
	IUser
} from '@rocket.chat/core-typings';
import moment from 'moment';
import { useCallback } from 'react';
import { usePersianDate } from '../lib/usePersianDate';

export const useTimeAgo = (): ((time: Date | number | string) => string) =>
	useCallback((time) => moment(time).calendar(null, { sameDay: 'LT', lastWeek: 'dddd LT', sameElse: 'LL' }), []);

export const useShortTimeAgo = (): ((time: Date | string | number, verbose?: boolean | undefined, short?: boolean | undefined) => string) =>
	useCallback(
		(time, verbose, short) => {
			const user: Pick<IUser, 'language' | 'username'> | null = Meteor.user();

			if (((user?.language as string | undefined) || 'fa') === 'fa')
				return usePersianDate(<Date>time, verbose, short);
			else
				return moment(time).calendar(null, {
					sameDay: 'LT',
					lastDay: '[Yesterday]',
					lastWeek: 'dddd',
					sameElse(now) {
						/*
						Using only this.isBefore():

						ERRORS:
							Cannot invoke an object which is possibly 'undefined'.
							This expression is not callable.
							Not all constituents of type 'CalendarSpecVal' are callable.
							Type 'string' has no call signatures.
						*/
						if ((this as unknown as moment.Moment).isBefore(now, 'year')) {
							return 'LL';
						}
						return 'MMM Do';
					},
				})
		}
		,
		[],
	);
