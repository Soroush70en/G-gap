import crypto from 'crypto';
import { API } from '../../../../api/server';
import { ensureTagAllowed } from '../../lib/partnerAuth';
import { loadExistingKeyRecord, decryptUserKeyFromRecord } from '../../lib/keyStore';
import { createLoginToken } from '../../lib/token';

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

				const { partnerId, userId, tag, exp, jti, signature } = this.bodyParams ?? {};
				if (!partnerId || !userId || !tag || !exp || !jti || !signature) {
					return API.v1.failure('missing fields');
				}

				// Tag allowlist (optional but recommended)
				ensureTagAllowed(String(tag));

				// Freshness + replay
				const now = Math.floor(Date.now() / 1000);
				const expNum = Number(exp);
				if (!Number.isFinite(expNum) || expNum < now) {
					return API.v1.failure('assertion expired');
				}
				if (usedJTI.has(jti)) {
					return API.v1.failure('replay detected');
				}
				usedJTI.set(jti, expNum);

				// Load user’s permanent key record and authorize partner/tag
				const rec = await loadExistingKeyRecord(String(userId));
				if (!rec || rec.status !== 'active' || rec.partnerId !== partnerId || rec.tag !== tag) {
					return API.v1.failure('key not active/authorized');
				}

				// Verify assertion signature with K_user
				const K_user = decryptUserKeyFromRecord(rec); // plaintext in memory only
				const toSign = `${partnerId}|${userId}|${tag}|${exp}|${jti}`;
				const mac = crypto.createHmac('sha256', K_user).update(toSign, 'utf8').digest('hex');

				if (!crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(String(signature), 'hex'))) {
					return API.v1.failure('bad signature');
				}

				// Mint Rocket.Chat login token
				const { token, expiresAt } = await createLoginToken(String(userId));
				return API.v1.success({ userId, authToken: token, expiresAt });
			} catch (e: any) {
				return API.v1.failure(e?.message || 'exchange failed');
			}
		},
	},
);
