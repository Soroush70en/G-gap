import type { IMessage } from './IMessage';
import type { IRoom } from './IRoom';

export interface INotificationItemPush {
	type: 'push';
	data: {
		payload: {
			sender: {
				_id: string;
				username: string;
				name?: string;
			};
			type: string;
		};
		roomName: string;
		username: string;
		message: string;
		badge: number;
		category: string;
	};
}

export interface INotificationItemEmail {
	type: 'email';
	data: {
		to: string;
		subject: string;
		html: string;
		data: {
			room_path: string;
		};
		from: string;
	};
}

export interface INotificationItemSfa {
	type: 'sfa';
	data: {
		payload: {
			senderSalesTeamId?: string;
			senderOrganizationId?: string;
			receiverSalesTeamId?: string;
			receiverOrganizationId?: string;
			body?: string;
		};
	};
}

export type NotificationItem = INotificationItemPush | INotificationItemEmail | INotificationItemSfa;

export interface INotification {
	_id: string;
	uid: string;
	rid: string;
	mid: string;
	ts: Date;
	schedule?: Date;
	sending?: Date;
	error?: string;
	items: NotificationItem[];
}

export interface INotificationDesktop {
	title: string;
	text: string;
	duration?: number;
	payload: {
		_id: IMessage['_id'];
		rid: IMessage['rid'];
		tmid?: IMessage['tmid'];
		sender: IMessage['u'];
		type: IRoom['t'];
		name: IRoom['name'];
		message: {
			msg: IMessage['msg'];
			t?: IMessage['t'];
		};
	};
}
