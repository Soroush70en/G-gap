import { fetch } from 'meteor/fetch';
import { roomCoordinator } from '../../../../../server/lib/rooms/roomCoordinator';
import { metrics } from '../../../../metrics/server';
import { settings } from '../../../../settings/server';
import { Logger } from '../../../../logger/server';
import { Users } from '../../../../models/server';

/**
 * Notify external SFA handler (non-blocking).
 *
 * Reads the receiver's customFields.tag and, if tag === 'sfa', posts a payload
 * to an external endpoint. Uses the same per-room notification text logic as desktop
 * so titles/text are consistent. Honors server privacy (pass in notificationMessage
 * already computed for the receiver).
 *
 * @param {string} userId The receiver's userId (target of the notification)
 * @param {object} user The sender user object
 * @param {object} room The room the message was sent in
 * @param {object} message The message object
 * @param {string} notificationMessage The text prepared for this receiver (per RC rules)
 * @param {object} [receiver] Optional receiver object (to avoid reloading)
 */
export async function notifySfaUser({ userId, user, message, room, notificationMessage, receiver }) {
	const log = new Logger('SFA-Notifier');
	console.log('heeey');

	const endpoint = (settings.get && settings.get('SFA_Notify_Endpoint')) || process.env.SFA_NOTIFY_URL;
	const token = (settings.get && settings.get('SFA_Notify_Token')) || process.env.SFA_NOTIFY_TOKEN;

	// If not configured, no-op
	if (!endpoint) {
		return;
	}

	try {
		const fromUser = await Users.findOneById(message?.u?._id, {
			fields: {
				_id: 1,
				username: 1,
				name: 1,
				customFields: 1,
			},
		});

		const toUser = await Users.findOneById(userId, {
			fields: {
				_id: 1,
				username: 1,
				name: 1,
				customFields: 1,
			},
		});

		if (!fromUser || fromUser.customFields.tag != 'sfa' || (!toUser && !toUser.customFields.tag != 'sfa')) {
			return;
		}

		const fromUserSalesTeamId = fromUser.customFields?.salesTeamId;
		const fromUserOrganizationId = fromUser.customFields?.organizationId;

		const toUserSalesTeamId = toUser.customFields?.salesTeamId;
		const toUserOrganizationId = toUser.customFields?.organizationId;

		// Generate title/text consistent with desktop notifications
		const { title, text } = roomCoordinator.getRoomDirectives(room.t)?.getNotificationDetails(room, user, notificationMessage, userId) || {
			title: '',
			text: '',
		};

		const payload = {
			payload: {
				senderSalesTeamId: fromUserSalesTeamId,
				senderOrganizationId: fromUserOrganizationId,
				receiverSalesTeamId: toUserSalesTeamId,
				receiverOrganizationId: toUserOrganizationId,
				body: message?.msg,
			},
			// message: {
			// 	id: message?._id,
			// 	ts: message?.ts,
			// 	tmid: message?.tmid,
			// 	rid: message?.rid,
			// 	msg: message?.msg,
			// 	t: message?.t,
			// },
		};

		console.log('=========PAYLOAD============');
		console.log(JSON.stringify(payload));
		console.log(endpoint);
		// Fire-and-forget with a short timeout so we never block RC's pipeline
		// const AbortCtl = globalThis.AbortController || AbortController;
		// const controller = new AbortCtl();
		// const timeout = setTimeout(() => controller.abort(), 2000);

		const res = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				//...(token ? { authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(payload),
		}).catch((err) => {
			console.log({ msg: 'SFA external notify failed', err: String(err?.message || err) });
			log.warn({ msg: 'SFA external notify failed', err: String(err?.message || err) });
		});

		console.log('RES', res);
		var data = await res.json();
		console.log('DATA', data);
		metrics.notificationsSent.inc({ notification_type: 'external_sfa' });
	} catch (err) {
		// Never throw — external failures must not impact core notifications
		const log = new Logger('SFA-Notifier');
		log.warn({ msg: 'SFA external notify threw', err: String(err?.message || err) });
	}
}

/**
 * Decide if we should attempt an SFA external notify for this receiver.
 * Mirrors the desktop/mobile shape so you can slot it into the same call sites.
 *
 * @param {object} params
 * @param {boolean} params.disableAllMessageNotifications
 * @param {'online'|'away'|'busy'|'offline'} [params.status]         // optional
 * @param {'online'|'away'|'busy'|'offline'} [params.statusConnection] // optional
 * @param {'all'|'mentions'|'nothing'|null|undefined} params.mobilePushNotifications
 * @param {boolean} params.hasMentionToAll
 * @param {boolean} params.hasMentionToHere
 * @param {boolean} params.isHighlighted
 * @param {boolean} params.hasMentionToUser
 * @param {boolean} params.hasReplyToThread
 * @param {'c'|'p'|'d'} params.roomType
 * @param {boolean} params.isThread
 * @returns {boolean}
 */
export function shouldNotifyExternalSfa({
	disableAllMessageNotifications,
	status,
	statusConnection,
	mobilePushNotifications,
	hasMentionToAll,
	hasMentionToHere,
	isHighlighted,
	hasMentionToUser,
	hasReplyToThread,
	roomType,
	isThread,
}) {
	// If server has globally disabled and the user hasn't set prefs: only direct triggers
	if (disableAllMessageNotifications && mobilePushNotifications == null && !isHighlighted && !hasMentionToUser && !hasReplyToThread) {
		return false;
	}

	// Treat DND/offline the same way as desktop/mobile blocks
	if (statusConnection === 'offline' || status === 'doNotDisturb' || mobilePushNotifications === 'nothing') {
		return false;
	}

	if (!mobilePushNotifications) {
		const serverDefault = settings.get('Accounts_Default_User_Preferences_mobilePushNotifications');
		if (serverDefault === 'all' && (!isThread || hasReplyToThread)) {
			return true;
		}
		if (serverDefault === 'nothing') {
			return false;
		}
	}

	return (
		(roomType === 'd' ||
			(!disableAllMessageNotifications && (hasMentionToAll || hasMentionToHere)) ||
			isHighlighted ||
			mobilePushNotifications === 'all' ||
			hasMentionToUser) &&
		(!isThread || hasReplyToThread)
	);
}
