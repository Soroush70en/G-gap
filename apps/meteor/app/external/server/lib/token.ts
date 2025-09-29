import { Accounts } from 'meteor/accounts-base';
import { Users } from '@rocket.chat/models';

export async function createLoginToken(userId: string) {
	const stamped = Accounts._generateStampedLoginToken();
	const hashed = Accounts._hashStampedToken(stamped);
	await Users.updateOne({ _id: userId }, { $push: { 'services.resume.loginTokens': hashed } });
	return {
		token: stamped.token,
		when: stamped.when,
		expiresAt: new Date(stamped.when.getTime() + 1000 * 60 * 60 * 24 * 7),
	};
}
