import { MessageReads } from '@rocket.chat/core-services';
import type { IMessage, IRoom, IUser } from '@rocket.chat/core-typings';

import { callbacks } from '../../../../../lib/callbacks';
import { ReadReceipt } from '../../../../server/lib/message-read-receipt/ReadReceipt';

callbacks.add(
	'afterReadMessages',
	(rid: IRoom['_id'], params: { uid: IUser['_id']; lastSeen?: Date; tmid?: IMessage['_id'] }) => {
		// if (!settings.get('Message_Read_Receipt_Enabled')) {
		// 	return;
		// }
		const { uid, lastSeen, tmid } = params;

		if (tmid) {
			MessageReads.readThread(uid, tmid);
		} else if (lastSeen) {
			ReadReceipt.markMessagesAsRead(rid, uid, lastSeen);
		}
	},
	callbacks.priority.MEDIUM,
	'message-read-receipt-afterReadMessages',
);
