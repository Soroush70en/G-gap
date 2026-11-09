import admin from 'firebase-admin';
import { EJSON } from 'meteor/ejson';
import gcm from 'node-gcm';

import { logger } from './logger';
import { settings } from '../../settings/server';

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

	logger.debug(`Create GCM Sender using "${options.gcm?.apiKey}"`);
	const sender = new gcm.Sender(options.gcm?.apiKey);

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

// Firebase Admin SDK app, (re)initialized from the `Firebase_config` setting (service account JSON)
let firebaseApp = null;

// FCM error codes meaning the device token is dead and should be dropped
const INVALID_TOKEN_ERRORS = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];

function parseServiceAccount(serviceAccountString) {
	if (!serviceAccountString || !String(serviceAccountString).trim()) {
		return null;
	}

	let parsed;
	try {
		parsed = JSON.parse(serviceAccountString);
	} catch (err) {
		logger.error({ msg: '[Firebase] Invalid JSON in Firebase_config setting', err: err.message });
		return null;
	}

	if (typeof parsed !== 'object' || parsed === null) {
		logger.error('[Firebase] Firebase_config must be a JSON object');
		return null;
	}

	const requiredKeys = ['project_id', 'client_email', 'private_key'];
	const missingKeys = requiredKeys.filter((key) => !parsed[key]);
	if (missingKeys.length) {
		logger.error(`[Firebase] Missing required keys in Firebase_config: ${missingKeys.join(', ')}`);
		return null;
	}

	// Keys pasted through some UIs keep "\n" escaped
	parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');

	return parsed;
}

async function configureFirebase(serviceAccountString) {
	if (firebaseApp) {
		const previous = firebaseApp;
		firebaseApp = null;
		try {
			await previous.delete();
		} catch (err) {
			logger.error({ msg: '[Firebase] Error deleting previous app', err: err.message });
		}
	}

	const serviceAccount = parseServiceAccount(serviceAccountString);
	if (!serviceAccount) {
		logger.warn('[Firebase] Firebase_config is not set or invalid; Android push (FCM) is disabled');
		return;
	}

	try {
		firebaseApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }, `rocketchat-push-${Date.now()}`);
		logger.info(`[Firebase] Initialized for project ${serviceAccount.project_id}`);
	} catch (err) {
		firebaseApp = null;
		logger.error({ msg: '[Firebase] Error initializing app', err: err.message });
	}
}

function convertToStrings(obj) {
	const result = {};
	for (const [key, value] of Object.entries(obj)) {
		result[key] = typeof value === 'string' ? value : String(value);
	}
	return result;
}

// Serialize reconfigurations so rapid setting changes can't race each other
let configuring = Promise.resolve();
settings.watch('Firebase_config', (value) => {
	configuring = configuring.then(() => configureFirebase(value));
});

export const sendFCM = function ({ userTokens, notification, _removeToken }) {
	if (!firebaseApp) {
		logger.warn('[Firebase] Not initialized, skipping FCM push. Check the Firebase_config setting.');
		return;
	}

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

	// Allow user to set payload
	const dataObj = notification.payload ? { ejson: EJSON.stringify(notification.payload) } : {};

	dataObj.title = notification.title;
	dataObj.message = notification.text;

	// Set image
	if (notification.image != null) {
		dataObj.image = notification.image;
	}

	// Set extra details
	if (notification.badge != null) {
		dataObj.msgcnt = notification.badge;
	}
	if (notification.sound != null) {
		dataObj.soundname = notification.sound;
	}
	if (notification.notId != null) {
		dataObj.notId = notification.notId;
	}
	if (notification.style != null) {
		dataObj.style = notification.style;
	}
	if (notification.summaryText != null) {
		dataObj.summaryText = notification.summaryText;
	}
	if (notification.picture != null) {
		dataObj.picture = notification.picture;
	}

	// Action Buttons
	if (notification.actions != null) {
		dataObj.actions = notification.actions;
	}

	// Force Start
	if (notification.forceStart != null) {
		dataObj['force-start'] = notification.forceStart;
	}

	if (notification.contentAvailable != null) {
		dataObj['content-available'] = notification.contentAvailable;
	}

	const data = convertToStrings(dataObj);

	userTokens.forEach((userToken) => {
		const message = {
			token: userToken,
			data,
		};
		firebaseApp
			.messaging()
			.send(message)
			.then((response) => {
				logger.debug({ msg: 'FCM message sent', response });
			})
			.catch((error) => {
				if (INVALID_TOKEN_ERRORS.includes(error?.code)) {
					logger.debug({ msg: 'FCM token is no longer valid, removing it', code: error.code });
					try {
						_removeToken({ gcm: userToken });
					} catch (err) {
						logger.error({ msg: 'Error removing token', err });
					}
					return;
				}
				logger.error({ msg: 'Error sending FCM message', code: error?.code, err: error?.message });
			});
	});
};
