import type { IUser } from '@rocket.chat/core-typings';
import { useSetting } from '@rocket.chat/ui-contexts';
import moment from 'moment';
import { useCallback } from 'react';
import { usePersianDate } from '../lib/usePersianDate';

export const useFormatDate = (): ((time: string | Date | number) => string) => {
	const format = useSetting('Message_DateFormat');
	return useCallback(
		(time) => {
			const user: Pick<IUser, 'language' | 'username'> | null = Meteor.user();

			if (((user?.language as string | undefined) || 'fa') === 'fa') {
				return usePersianDate(<Date>time);
			} else return moment(time).format(String(format));
		},

		[format],
	);
};
