import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Users } from '@rocket.chat/models';

import { verifyPartnerAssertion, assertionReplayExpiry } from './lib/assertion';
import { consumeAssertionId } from './lib/usedAssertions';

const LOGIN_TYPE = 'partner';

function failure(code: string, reason: string) {
	return { type: LOGIN_TYPE, error: new Meteor.Error(code, reason) };
}

async function loginWithAssertion(assertion: unknown) {
	const claims = await verifyPartnerAssertion(assertion);

	const user = await Users.findOneById(claims.sub, { projection: { customFields: 1 } });
	const externalAuth = user?.customFields?.externalAuth;
	// Only users this partner registered; a revoked record blocks login.
	if (!user || externalAuth?.partnerId !== claims.iss || !['active', 'pending'].includes(externalAuth?.status)) {
		return failure('user-not-authorized', 'user is not registered for this partner');
	}

	if (String(user.customFields?.tag) !== claims.tag) {
		return failure('tag-mismatch', 'tag does not match the user');
	}

	// Last, so a rejected login does not burn the jti; the unique insert still stops two concurrent uses.
	if (!(await consumeAssertionId(claims.iss, claims.jti, assertionReplayExpiry(claims)))) {
		return failure('assertion-replayed', 'assertion was already used');
	}

	// Accounts.validateLoginAttempt then runs the usual checks (active user, roles, login blocking).
	return { type: LOGIN_TYPE, userId: user._id };
}

// Login request: { partner: { assertion: '<JWT>' } }, over REST (POST /api/v1/login) or DDP (method "login").
Accounts.registerLoginHandler(LOGIN_TYPE, (loginRequest: Record<string, any>) => {
	if (!loginRequest[LOGIN_TYPE]) {
		return undefined;
	}

	try {
		return Promise.await(loginWithAssertion(loginRequest[LOGIN_TYPE].assertion));
	} catch (e: any) {
		if (e instanceof Meteor.Error) {
			return { type: LOGIN_TYPE, error: e };
		}
		console.error('partner login failed', e);
		return failure('partner-login-failed', 'login failed');
	}
});
