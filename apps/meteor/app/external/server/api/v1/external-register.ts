import { API } from '../../../../api/server';
import { verifyPartnerHMAC, ensureTagAllowed, getPartnerIdEnv } from '../../lib/partnerAuth';
import { upsertUser } from '../../lib/userUpsert';
import {
	loadExistingKeyRecord,
	decryptUserKeyFromRecord,
	generateUserKey,
	saveNewPermanentKey,
	encryptForPartnerTransport,
} from '../../lib/keyStore';

API.v1.addRoute(
	'external.register',
	{ authRequired: false },
	{
		async post() {
			try {
				verifyPartnerHMAC(this.request);

				const { tag, username, email, name, roles, metadata } = this.bodyParams ?? {};
				ensureTagAllowed(tag);

				const userId = await upsertUser({ username, email, name, roles, tag, metadata });

				// 1) If user already has a permanent key → reuse it
				const existing = await loadExistingKeyRecord(userId);
				if (existing && existing.status === 'active') {
					const keyPlain = decryptUserKeyFromRecord(existing);
					const keyForPartner = encryptForPartnerTransport(keyPlain);
					return API.v1.success({ userId, key: keyForPartner, kid: existing.kid || 'v1' });
				}

				// 2) Else generate once, store enc-at-rest + fingerprint, return encrypted for partner
				const keyPlain = generateUserKey();
				await saveNewPermanentKey(userId, getPartnerIdEnv(), tag, keyPlain, 'v1');
				const keyForPartner = encryptForPartnerTransport(keyPlain);

				return API.v1.success({ userId, key: keyForPartner, kid: 'v1' });
			} catch (e: any) {
				return API.v1.failure(e?.message || 'registration failed');
			}
		},
	},
);
