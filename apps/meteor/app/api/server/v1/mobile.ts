import { API } from '../api';
import { Notifications } from '/app/notifications/server';
import { Users } from '@rocket.chat/models';

API.v1.addRoute(
	'mobile.review-request',
	{ authRequired: false },
	{
		async post() {
			console.log('hello');
			console.log(this.bodyParams);

			const payload = this.bodyParams;

			const user = await Users.findOneByUsername(payload.username, { projection: { _id: 1 } });
			const userId = user?._id ? String(user._id) : undefined;
			if (!userId) {
				throw new Meteor.Error('error-not-found', 'User is not found', {
					method: 'mobile.review-request',
				});
			}

			// This triggers the `onUser('request-reviewed', ...)` listener on the client
			Notifications.notifyUser(userId, 'request-reviewed', payload);

			return API.v1.success();
		},
	},
);
