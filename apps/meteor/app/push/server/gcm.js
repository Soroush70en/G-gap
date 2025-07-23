import admin from 'firebase-admin';
import { EJSON } from 'meteor/ejson';
import { logger } from './logger';
import gcm from 'node-gcm';

export const sendGCM = function ({ userTokens, notification, _replaceToken, _removeToken, options }) {
	if (typeof notification.gcm === 'object') {
		notification = Object.assign({}, notification, notification.gcm);
	}

	// Make sure userTokens are an array of strings
	if (typeof userTokens === 'string') {
		userTokens = [userTokens];
	}

	// Check if any tokens in there to send
	if (!userTokens.length) {
		logger.debug('sendGCM no push tokens found');
		return;
	}

	logger.debug('sendGCM', userTokens, notification);

	// Allow user to set payload
	const data = notification.payload ? { ejson: EJSON.stringify(notification.payload) } : {};

	data.title = notification.title;
	data.message = notification.text;

	// Set image
	if (notification.image != null) {
		data.image = notification.image;
	}

	if (notification.android_channel_id != null) {
		data.android_channel_id = notification.android_channel_id;
	} else {
		logger.debug(
			'For devices running Android 8.0 or later you are required to provide an android_channel_id. See https://github.com/raix/push/issues/341 for more info',
		);
	}

	// Set extra details
	if (notification.badge != null) {
		data.msgcnt = notification.badge;
	}
	if (notification.sound != null) {
		data.soundname = notification.sound;
	}
	if (notification.notId != null) {
		data.notId = notification.notId;
	}
	if (notification.style != null) {
		data.style = notification.style;
	}
	if (notification.summaryText != null) {
		data.summaryText = notification.summaryText;
	}
	if (notification.picture != null) {
		data.picture = notification.picture;
	}

	// Action Buttons
	if (notification.actions != null) {
		data.actions = notification.actions;
	}

	// Force Start
	if (notification.forceStart != null) {
		data['force-start'] = notification.forceStart;
	}

	if (notification.contentAvailable != null) {
		data['content-available'] = notification.contentAvailable;
	}

	const message = new gcm.Message({
		collapseKey: notification.from,
		// Requires delivery of real-time messages to users while device is in Doze or app is in App Standby.
		// https://developer.android.com/training/monitoring-device-state/doze-standby#exemption-cases
		priority: 'high',
		//    delayWhileIdle: true,
		//    timeToLive: 4,
		//    restricted_package_name: 'dk.gi2.app'
		data,
	});

	logger.debug(`Create GCM Sender using "${options.gcm.apiKey}"`);
	const sender = new gcm.Sender(options.gcm.apiKey);

	userTokens.forEach((value) => logger.debug(`A:Send message to: ${value}`));

	const userToken = userTokens.length === 1 ? userTokens[0] : null;

	sender.send(message, userTokens, 5, function (err, result) {
		if (err) {
			logger.debug({ msg: 'ANDROID ERROR: result of sender', result });
			return;
		}

		if (result === null) {
			logger.debug('ANDROID: Result of sender is null');
			return;
		}

		logger.debug({ msg: 'ANDROID: Result of sender', result });

		if (result.canonical_ids === 1 && userToken) {
			// This is an old device, token is replaced
			try {
				_replaceToken({ gcm: userToken }, { gcm: result.results[0].registration_id });
			} catch (err) {
				logger.error({ msg: 'Error replacing token', err });
			}
		}
		// We cant send to that token - might not be registered
		// ask the user to remove the token from the list
		if (result.failure !== 0 && userToken) {
			// This is an old device, token is replaced
			try {
				_removeToken({ gcm: userToken });
			} catch (err) {
				logger.error({ msg: 'Error removing token', err });
			}
		}
	});
};

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account.json'); // مسیر به فایل serviceAccount
if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
	});
}

export const sendFCM = function ({ userTokens, notification, _replaceToken, _removeToken, options }) {
	console.log('===========================================SendFCM Called===========================================');
	if (typeof notification.gcm === 'object') {
		notification = Object.assign({}, notification, notification.gcm);
	}

	// Make sure userTokens are an array of strings
	if (typeof userTokens === 'string') {
		userTokens = [userTokens];
	}

	// Check if any tokens in there to send
	if (!userTokens.length) {
		console.log('sendFCM no push tokens found');
		return;
	}

	console.log('sendFCM', userTokens, notification);

	// Allow user to set payload
	const data = notification.payload ? { ejson: EJSON.stringify(notification.payload) } : {};

	data.title = notification.title;
	data.message = notification.text;

	// Set image
	if (notification.image != null) {
		data.image = notification.image;
	}

	// Set extra details
	if (notification.badge != null) {
		data.msgcnt = notification.badge;
	}
	if (notification.sound != null) {
		data.soundname = notification.sound;
	}
	if (notification.notId != null) {
		data.notId = notification.notId;
	}
	if (notification.style != null) {
		data.style = notification.style;
	}
	if (notification.summaryText != null) {
		data.summaryText = notification.summaryText;
	}
	if (notification.picture != null) {
		data.picture = notification.picture;
	}

	// Action Buttons
	if (notification.actions != null) {
		data.actions = notification.actions;
	}

	// Force Start
	if (notification.forceStart != null) {
		data['force-start'] = notification.forceStart;
	}

	if (notification.contentAvailable != null) {
		data['content-available'] = notification.contentAvailable;
	}

	if (notification.payload?.host != null) {
		data.host = notification.payload?.host;
	}

	if (notification.payload?.rid != null) {
		data.rid = notification.payload?.rid;
	}

	if (notification.payload?.type != null) {
		data.type = notification.payload?.type;
	}

	if (notification.payload?.sender != null) {
		const senderObj = {
			username: notification.payload?.sender.username,
			name: notification.payload?.sender.name,
		};
		data.sender = JSON.stringify(senderObj);
	}

	if (notification.payload?._id != null) {
		data._id = notification.payload?._id;
	}

	if (notification.payload?.messageId != null) {
		data.messageId = notification.payload?.messageId;
	}

	if (notification.payload?.notificationType != null) {
		data.notificationType = notification.payload?.notificationType;
	}

	if (notification.payload?.senderName != null) {
		data.senderName = notification.payload?.senderName;
	}

	if (notification.payload?.callId != null) {
		data.callId = notification.payload?.callId;
	}

	if (notification.payload?.message != null) {
		data.senderName = notification.payload?.message.msg;
	}

	const notifObject = {
		title: notification.title,
		body: notification.payload?.message?.msg,
	};

	console.log('===========================================NOTIFOBJECT===========================================');
	console.log(notifObject);

	console.log('===========================================NOTIFDATA===========================================');
	console.log(data);

	userTokens.forEach((userToken) => {
		const message = {
			notification: notifObject,
			token: userToken,
			data,
		};
		console.log('===========================================MESSAGE===========================================');
		console.log(message);
		admin
			.messaging()
			.send(message)
			.then((response) => {
				console.log('FCM message sent successfully:', response);
			})
			.catch((error) => {
				console.error('Error sending FCM message:', error);
			});
	});
};
