import { useSetting, useUserPreference } from '@rocket.chat/ui-contexts';
import type { MomentInput } from 'moment';
import moment from 'moment';
import { useCallback } from 'react';

type UseFormatDateAndTimeParams = {
	withSeconds?: boolean;
};

import type {
	IUser
} from '@rocket.chat/core-typings';

import { usePersianDate } from '../lib/usePersianDate';

export const useFormatDateAndTime = ({ withSeconds }: UseFormatDateAndTimeParams = {}): ((input: MomentInput) => string) => {
	const clockMode = useUserPreference('clockMode');
	const format = useSetting('Message_TimeAndDateFormat') as string;

	return useCallback(
		(time) => {
			const user: Pick<IUser, 'language' | 'username'> | null = Meteor.user();
			if (((user?.language as string | undefined) || 'fa') === 'fa'){
				switch (clockMode) {
					case 1:
						return usePersianDate(<Date>time) + moment(time).format(withSeconds ? 'h:mm:ss A' : 'h:mm A');
					case 2:
						return usePersianDate(<Date>time) + moment(time).format(withSeconds ? 'H:mm:ss' : 'H:mm');
					default:
						return moment(time).format(withSeconds ? 'H:mm:ss' : 'H:mm') + " " + usePersianDate(<Date>time); // + moment(time).format(withSeconds ? 'L LTS' : format);
				}
			}
			else
			switch (clockMode) {
				case 1:
					return moment(time).format(withSeconds ? 'MMMM D, Y h:mm:ss A' : 'MMMM D, Y h:mm A');
				case 2:
					return moment(time).format(withSeconds ? 'MMMM D, Y H:mm:ss' : 'MMMM D, Y H:mm');

				default:
					return moment(time).format(withSeconds ? 'L LTS' : format);
			}
		},
		[clockMode, format, withSeconds],
	);
};
