import crypto from 'crypto';
import { Partners } from '@rocket.chat/models';
import type { IPartnerPublicKey } from '@rocket.chat/core-typings';

import { API } from '../../../../api/server';
import { hasPermissionAsync } from '../../../../authorization/server/functions/hasPermission';
import { MANAGE_EXTERNAL_PARTNERS as PERMISSION } from '../../permissions';

// Partner login keys (ES256). The server makes the key pair, keeps only the public key,
// and returns the private key once. The private key is never stored or logged.

// Two active keys allow rotation: issue the new key, switch the partner to it, retire the old one.
const MAX_ACTIVE_KEYS = 2;

async function findPartner(partnerId: unknown) {
	if (typeof partnerId !== 'string' || !partnerId) {
		return null;
	}
	return Partners.findOne({ partnerId }, { projection: { partnerId: 1, publicKeys: 1 } });
}

// These routes are not declared in @rocket.chat/rest-typings, so their params are typed here.
type PartnerKeyParams = { partnerId?: unknown; kid?: unknown };

const toPublicView = (key: IPartnerPublicKey) => ({ kid: key.kid, status: key.status, createdAt: key.createdAt, publicKeyPem: key.pem });

API.v1.addRoute(
	'external.partnerKeys.create',
	{ authRequired: true },
	{
		async post() {
			if (!(await hasPermissionAsync(this.userId, PERMISSION))) {
				return API.v1.unauthorized();
			}

			const partner = await findPartner((this.bodyParams as PartnerKeyParams)?.partnerId);
			if (!partner) {
				return API.v1.failure('partner not found', 'partner-not-found');
			}

			const activeKeys = (partner.publicKeys ?? []).filter((k) => k.status === 'active');
			if (activeKeys.length >= MAX_ACTIVE_KEYS) {
				return API.v1.failure(`a partner can have at most ${MAX_ACTIVE_KEYS} active keys; retire one first`, 'too-many-active-keys');
			}

			const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
				namedCurve: 'prime256v1',
				publicKeyEncoding: { type: 'spki', format: 'pem' },
				privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
			});

			const createdAt = new Date();
			const kid = `${createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex')}`;
			const key: IPartnerPublicKey = { kid, pem: publicKey, status: 'active', createdAt };

			await Partners.updateOne({ partnerId: partner.partnerId }, { $push: { publicKeys: key }, $set: { _updatedAt: createdAt } });

			// The private key exists only in this response.
			this.response.setHeader('Cache-Control', 'no-store');
			return API.v1.success({
				partnerId: partner.partnerId,
				algorithm: 'ES256',
				...toPublicView(key),
				privateKeyPem: privateKey,
			});
		},
	},
);

API.v1.addRoute(
	'external.partnerKeys.list',
	{ authRequired: true },
	{
		async get() {
			if (!(await hasPermissionAsync(this.userId, PERMISSION))) {
				return API.v1.unauthorized();
			}

			const partner = await findPartner((this.queryParams as PartnerKeyParams)?.partnerId);
			if (!partner) {
				return API.v1.failure('partner not found', 'partner-not-found');
			}

			return API.v1.success({ partnerId: partner.partnerId, keys: (partner.publicKeys ?? []).map(toPublicView) });
		},
	},
);

API.v1.addRoute(
	'external.partnerKeys.retire',
	{ authRequired: true },
	{
		async post() {
			if (!(await hasPermissionAsync(this.userId, PERMISSION))) {
				return API.v1.unauthorized();
			}

			const { partnerId, kid } = (this.bodyParams ?? {}) as PartnerKeyParams;
			const partner = await findPartner(partnerId);
			if (!partner) {
				return API.v1.failure('partner not found', 'partner-not-found');
			}
			if (!partner.publicKeys?.some((k) => k.kid === kid && k.status === 'active')) {
				return API.v1.failure('no active key with this kid', 'key-not-found');
			}

			// Retired keys stay listed for audit; login rejects them at once.
			await Partners.updateOne(
				{ partnerId: partner.partnerId, 'publicKeys.kid': kid },
				{ $set: { 'publicKeys.$.status': 'retired', '_updatedAt': new Date() } },
			);

			return API.v1.success({ partnerId: partner.partnerId, kid, status: 'retired' });
		},
	},
);
