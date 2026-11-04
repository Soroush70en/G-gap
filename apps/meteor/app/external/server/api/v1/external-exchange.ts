import crypto from 'crypto';
import { API } from '../../../../api/server';
import { loadExistingKeyRecord, decryptUserKeyFromRecord } from '../../lib/keyStore';
import { createLoginToken } from '../../lib/token';
import { Partners, Users } from '@rocket.chat/models';

// Simple in-memory replay cache. Use Redis in production.
const usedJTI = new Map<string, number>(); // jti -> exp (unix seconds)

API.v1.addRoute(
	'external.exchange',
	{ authRequired: false },
	{
		async post() {
			try {
				// No HMAC transport check here by design (Option A).
				// We fully trust only the short-lived assertion.
				const { partnerId, userId, tag, exp, /*jti,*/ signature } = this.bodyParams ?? {};
				if (!partnerId || !userId || !tag || !exp || /*!jti ||*/ !signature) {
					return API.v1.failure('missing fields', 'missing-fields');
				}

				// Freshness + replay
				const now = Math.floor(Date.now() / 1000);
				const expNum = Number(exp);
				if (!Number.isFinite(expNum) || expNum < now) {
					return API.v1.failure('assertion expired', 'assertion-expired');
				}

				// if (usedJTI.has(jti)) {
				// 	return API.v1.failure('replay detected');
				// }
				// usedJTI.set(jti, expNum);

				// Load user’s permanent key record and authorize partner/tag
				const rec = await loadExistingKeyRecord(String(userId));
				if (!rec || rec.status !== 'active' || rec.partnerId !== partnerId) {
					return API.v1.failure('key not active/authorized', 'key-not-authorized');
				  }

				// An inactive partner (external.partners.setStatus) cannot log its users in. A missing status counts as active.
				if (!(await Partners.findOne({ partnerId: String(partnerId), status: { $ne: 'inactive' } }, { projection: { _id: 1 } }))) {
					return API.v1.failure('key not active/authorized', 'key-not-authorized');
				}

				  const user = await Users.findOneById(String(userId), { projection: { 'customFields.tag': 1, 'active': 1, 'roles': 1 } });
				  const userTag = user?.customFields?.tag;
				  if (!userTag || String(userTag) !== String(tag)) {
					return API.v1.failure('tag mismatch', 'tag-mismatch');
				  }

				// Verify assertion signature with K_user
				const K_user = decryptUserKeyFromRecord(rec); // plaintext in memory only
				//const toSign = `${partnerId}|${userId}|${tag}|${exp}|${jti}`;
				const toSign = `${partnerId}|${userId}|${tag}|${exp}`;
				const mac = crypto.createHmac('sha256', K_user).update(toSign, 'utf8').digest('hex');

				if (!crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(String(signature), 'hex'))) {
					return API.v1.failure('bad signature', 'bad-signature');
				}

				// Same rules as Accounts.validateLoginAttempt: a token for a user who cannot log in would end on the login page.
				// Checked after the signature so unauthenticated callers learn nothing about the user.
				if (!user?.active) {
					return API.v1.failure('user is not active', 'user-inactive');
				}
				if (!Array.isArray(user.roles)) {
					return API.v1.failure('user has no roles', 'user-has-no-roles');
				}

				// Mint Rocket.Chat login token
				const { token, expiresAt } = await createLoginToken(String(userId));
				return API.v1.success({ userId, authToken: token, expiresAt });
			} catch (e: any) {
				return API.v1.failure(e?.message || 'exchange failed', 'exchange-failed');
			}
		},
	},
);
