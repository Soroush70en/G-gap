import { fetch } from 'meteor/fetch';

import { Logger } from '../../../../logger/server';
import { metrics } from '../../../../metrics/server';
import { Users } from '../../../../models/server';
import { settings } from '../../../../settings/server';

const logger = new Logger('SFA-Notifier');

const getEndpoint = () => settings.get('SFA_Notify_Endpoint') || process.env.SFA_NOTIFY_URL;

const userFields = {
	fields: {
		_id: 1,
		customFields: 1,
	},
};

/**
 * Builds the SFA queue item data for a receiver, or returns null when SFA should not be notified.
 * Both the sender and the receiver must be tagged as SFA users (customFields.tag === 'sfa').
 *
 * Runs when the message is sent; the actual HTTP call happens later from the notification queue,
 * so it is delayed for online users and cancelled if the receiver reads the room in the meantime.
 *
 * @param {object} params
 * @param {string} params.senderId The sender's userId
 * @param {string} params.receiverId The receiver's userId
 * @param {object} params.message The message object
 * @returns {Promise<object|null>}
 */
export async function getSfaData({ senderId, receiverId, message }) {
	if (!getEndpoint()) {
		return null;
	}

	const fromUser = await Users.findOneById(senderId, userFields);
	if (fromUser?.customFields?.tag !== 'sfa') {
		return null;
	}

	const toUser = await Users.findOneById(receiverId, userFields);
	if (toUser?.customFields?.tag !== 'sfa') {
		return null;
	}

	return {
		payload: {
			senderSalesTeamId: fromUser.customFields.salesTeamId,
			senderOrganizationId: fromUser.customFields.organizationId,
			receiverSalesTeamId: toUser.customFields.salesTeamId,
			receiverOrganizationId: toUser.customFields.organizationId,
			body: message?.msg,
		},
	};
}

/**
 * Sends a queued SFA notification to the external endpoint.
 * Never throws: external failures must not impact the notification queue.
 *
 * @param {object} data The data produced by getSfaData
 */
export async function sendSfaNotification(data) {
	const endpoint = getEndpoint();
	if (!endpoint) {
		return;
	}

	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify(data),
		});

		if (!res.ok) {
			logger.warn({ msg: 'SFA external notify failed', status: res.status });
			return;
		}

		metrics.notificationsSent.inc({ notification_type: 'external_sfa' });
	} catch (err) {
		logger.warn({ msg: 'SFA external notify threw', err: String(err?.message || err) });
	}
}

/**
 * Decide if we should attempt an SFA external notify for this receiver.
 * Follows the receiver's mobile push preferences, since SFA acts as their mobile channel.
 *
 * @param {object} params
 * @param {boolean} params.disableAllMessageNotifications
 * @param {string} [params.status]
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

	if (status === 'doNotDisturb' || mobilePushNotifications === 'nothing') {
		return false;
	}

	if (!mobilePushNotifications) {
		const serverDefault = settings.get('Accounts_Default_User_Preferences_pushNotifications');
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
