import type { IRoom } from '@rocket.chat/core-typings';
import { isThreadMessage } from '@rocket.chat/core-typings';
import { MessageDivider } from '@rocket.chat/fuselage';
import { useSetting, useTranslation } from '@rocket.chat/ui-contexts';
import type { ReactElement, ComponentProps } from 'react';
import React, { Fragment, memo } from 'react';

import { MessageTypes } from '../../../../app/ui-utils/client';
import RoomMessage from '../../../components/message/variants/RoomMessage';
import SystemMessage from '../../../components/message/variants/SystemMessage';
import ThreadMessagePreview from '../../../components/message/variants/ThreadMessagePreview';
import { useFormatDate } from '../../../hooks/useFormatDate';
import { useRoomSubscription } from '../contexts/RoomContext';
import { SelectedMessagesProvider } from '../providers/SelectedMessagesProvider';
import { useMessages } from './hooks/useMessages';
import { isMessageFirstUnread } from './lib/isMessageFirstUnread';
import { isMessageNewDay } from './lib/isMessageNewDay';
import { isMessageSequential } from './lib/isMessageSequential';
import MessageListProvider from './providers/MessageListProvider';
import { usePersianDate } from './hooks/usePersianDate';



type MessageListProps = {
	rid: IRoom['_id'];
	scrollMessageList: ComponentProps<typeof MessageListProvider>['scrollMessageList'];
};

// const weekDaysFa = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
// const monthNamesFa = [
// 	'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
// 	'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
// ];

// export function toPersianDate(date: Date, verbose = false): string {
// 	const { jy, jm, jd } = toJalaali(date);
// 	const pad = (n: number) => n.toString().padStart(2, '0');

// 	if (verbose) {
// 		const dayName = weekDaysFa[date.getDay()];
// 		const monthName = monthNamesFa[jm - 1];
// 		return `${dayName} ${jd} ${monthName} ${jy}`; // مثل: شنبه ۲۸ تیر ۱۴۰۴
// 	}

// 	return `${jy}/${pad(jm)}/${pad(jd)}`; // مثل: ۱۴۰۴/۰۴/۲۸
// }

export const MessageList = ({ rid, scrollMessageList }: MessageListProps): ReactElement => {
	const t = useTranslation();
	const messages = useMessages({ rid });
	const subscription = useRoomSubscription();
	const messageGroupingPeriod = Number(useSetting('Message_GroupingPeriod'));
	const formatDate = useFormatDate();

	return (
		<MessageListProvider scrollMessageList={scrollMessageList}>
			<SelectedMessagesProvider>
				{messages.map((message, index, { [index - 1]: previous }) => {
					const sequential = isMessageSequential(message, previous, messageGroupingPeriod);

					const newDay = isMessageNewDay(message, previous);
					const firstUnread = isMessageFirstUnread(subscription, message, previous);
					const showDivider = newDay || firstUnread;

					const shouldShowAsSequential = sequential && !newDay;

					const system = MessageTypes.isSystemMessage(message);
					const visible = !isThreadMessage(message) && !system;

					const unread = Boolean(subscription?.tunread?.includes(message._id));
					const mention = Boolean(subscription?.tunreadUser?.includes(message._id));
					const all = Boolean(subscription?.tunreadGroup?.includes(message._id));
					const ignoredUser = Boolean(subscription?.ignored?.includes(message.u._id));
					return (
						
						<Fragment key={message._id}>
							{showDivider && (
								<MessageDivider unreadLabel={firstUnread ? t('Unread_Messages').toLowerCase() : undefined}>
									{newDay && usePersianDate(new Date(message.ts),true)}
								</MessageDivider>

							)}

							{visible && (
								<RoomMessage
									message={message}
									sequential={shouldShowAsSequential}
									unread={unread}
									mention={mention}
									all={all}
									ignoredUser={ignoredUser}
								/>
							)}

							{isThreadMessage(message) && (
								<ThreadMessagePreview
									data-mid={message._id}
									data-tmid={message.tmid}
									data-unread={firstUnread}
									data-sequential={sequential}
									sequential={shouldShowAsSequential}
									message={message}
								/>
							)}

							{system && <SystemMessage message={message} />}
						</Fragment>
					);
				})}
			</SelectedMessagesProvider>
		</MessageListProvider>
	);
};

export default memo(MessageList);
