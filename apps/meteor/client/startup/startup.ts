import type { UserStatus } from '@rocket.chat/core-typings';
import { Accounts } from 'meteor/accounts-base';
import { UserPresence } from 'meteor/konecty:user-presence';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Tracker } from 'meteor/tracker';
import moment from 'moment';

import 'hljs9/styles/github.css';
import { hasPermission } from '../../app/authorization/client';
import { register } from '../../app/markdown/lib/hljs';
import { settings } from '../../app/settings/client';
import { getUserPreference, t } from '../../app/utils/client';
import * as banners from '../lib/banners';
import { setIncomingCall } from '../lib/incomingCallStore';
import { dispatchToastMessage } from '../lib/toast';
import { removeLocalUserData, synchronizeUserData } from '../lib/userData';
import { fireGlobalEvent } from '../lib/utils/fireGlobalEvent';

//const dispatchToast = useToastMessageDispatch();
const originalLivedataHandler = Meteor.connection._livedata_data;

Meteor.connection._livedata_data = function (message) {
	try {
		if ((message as any)?.fields?.args?.length > 0) {
			if (
				(message as any)?.fields?.args[0]?.payload?.message?.t === 'videoconf' &&
				(message as any)?.fields?.args[0]?.payload?.sender?._id != Meteor.userId() &&
				(message as any)?.fields?.args[0]?.payload?.message?.type === 'videoconference'
			) {
				setIncomingCall({
					callerId: (message as any)?.fields?.args[0]?.payload?.sender?._id ?? '',
					callerName: (message as any)?.fields?.args[0]?.payload?.sender?.name ?? 'ناشناس',
					callId: (message as any)?.fields?.args[0]?.payload?.callId,
					username: (message as any)?.fields?.args[0]?.payload?.sender?.username,
				});
			} else if (
				(message as any)?.fields?.args[0]?.action === 'join' &&
				(message as any)?.fields?.args[0]?.params.uid === Meteor.userId() &&
				(message as any)?.fields?.args[0]?.params.type === 'videoconference.add'
			) {
				setIncomingCall({
					callerId: (message as any)?.fields?.args[0]?.params?.callerId ?? '',
					callerName: (message as any)?.fields?.args[0]?.params?.name ?? 'ناشناس',
					callId: (message as any)?.fields?.args[0]?.params.callId,
					username: (message as any)?.fields?.args[0]?.params.username,
				});
			}
		}
	} catch (e) {
		console.error(e);
	}

	// try {
	// 	if (
	// 		(message as any)?.fields?.args[0]?.action === 'videoConference/accepted' &&
	// 		(message as any)?.fields?.args[0]?.params?.uid != Meteor.userId()
	// 	) {
	// 		dispatchToastMessage({ type: 'success', message: (message as any)?.fields?.args[0]?.params?.user.name + ' تماس را پذیرفت.' });
	// 	}
	// } catch (e) {
	// 	console.error(e);
	// }

	try {
		if ((message as any)?.fields?.args[0]?.action === 'videoConference/declined') {
			dispatchToastMessage({ type: 'error', message: (message as any)?.fields?.args[0]?.params?.name + 'تماس را نپذیرفت.' });
		}
	} catch (e) {
		console.error(e);
	}

	// اجرای handler اصلی تا Meteor دچار اختلال نشه
	return originalLivedataHandler.call(this, message);
};

Meteor.startup(() => {
	fireGlobalEvent('startup', true);

	Accounts.onLogout(() => Session.set('openedRoom', null));

	Session.setDefault('AvatarRandom', 0);

	window.lastMessageWindow = {};
	window.lastMessageWindowHistory = {};

	let status: UserStatus | undefined = undefined;
	Tracker.autorun(async () => {
		const uid = Meteor.userId();
		if (!uid) {
			removeLocalUserData();
			return;
		}
		if (!Meteor.status().connected) {
			return;
		}

		const user = await synchronizeUserData(uid);
		if (!user) {
			return;
		}

		const utcOffset = moment().utcOffset() / 60;
		if (user.utcOffset !== utcOffset) {
			Meteor.call('userSetUtcOffset', utcOffset);
		}

		if (getUserPreference(user, 'enableAutoAway')) {
			const idleTimeLimit = (getUserPreference(user, 'idleTimeLimit') as number | null | undefined) || 300;
			UserPresence.awayTime = idleTimeLimit * 1000;
		} else {
			delete UserPresence.awayTime;
			UserPresence.stopTimer();
		}

		UserPresence.start();

		if (user.status !== status) {
			status = user.status;
			fireGlobalEvent('status-changed', status);
		}
	});

	Tracker.autorun(async (c) => {
		const uid = Meteor.userId();
		if (!uid) {
			return;
		}

		if (!hasPermission('manage-cloud')) {
			return;
		}

		Meteor.call('cloud:checkRegisterStatus', (err: unknown, data: { connectToCloud?: boolean; workspaceRegistered?: boolean }) => {
			if (err) {
				console.log(err);
				return;
			}

			c.stop();
			const { connectToCloud = false, workspaceRegistered = false } = data;
			if (connectToCloud === true && workspaceRegistered !== true) {
				banners.open({
					id: 'cloud-registration',
					title: t('Cloud_registration_pending_title'),
					html: t('Cloud_registration_pending_html'),
					modifiers: ['large', 'danger'],
				});
			}
		});
	});
});
Meteor.startup(() => {
	Tracker.autorun(() => {
		const code = settings.get('Message_Code_highlight') as string | undefined;
		code?.split(',').forEach((language: string) => {
			language.trim() && register(language.trim());
		});
	});
});
