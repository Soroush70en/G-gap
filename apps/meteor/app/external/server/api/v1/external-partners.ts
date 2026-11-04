import crypto from 'crypto';
import { Partners } from '@rocket.chat/models';
import type { IPartner } from '@rocket.chat/core-typings';

import { API } from '../../../../api/server';
import { hasPermissionAsync } from '../../../../authorization/server/functions/hasPermission';
import { MANAGE_EXTERNAL_PARTNERS } from '../../permissions';

// These routes are not declared in @rocket.chat/rest-typings, so their params are typed here.
type PartnerParams = { name?: unknown; allowedTags?: unknown; partnerId?: unknown; status?: unknown };

const STATUSES: IPartner['status'][] = ['active', 'inactive'];

const isNonEmptyString = (v: unknown, max = 100): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

API.v1.addRoute(
	'external.partners.list',
	{ authRequired: true },
	{
		async get() {
			if (!(await hasPermissionAsync(this.userId, MANAGE_EXTERNAL_PARTNERS))) {
				return API.v1.unauthorized();
			}

			// The projection keeps partnerSecret and keys out of the response.
			const partners = await Partners.find({}, { projection: { _id: 0, partnerId: 1, name: 1 }, sort: { name: 1 } }).toArray();

			return API.v1.success({ partners: partners.map(({ partnerId, name }) => ({ partnerId, name })) });
		},
	},
);

API.v1.addRoute(
	'external.partners.create',
	{ authRequired: true },
	{
		async post() {
			if (!(await hasPermissionAsync(this.userId, MANAGE_EXTERNAL_PARTNERS))) {
				return API.v1.unauthorized();
			}

			const { name, allowedTags } = (this.bodyParams ?? {}) as PartnerParams;
			if (!isNonEmptyString(name)) {
				return API.v1.failure('name is required (max 100 characters)', 'invalid-name');
			}
			if (!Array.isArray(allowedTags) || allowedTags.length === 0 || !allowedTags.every((t) => isNonEmptyString(t, 50))) {
				return API.v1.failure('allowedTags must be a non-empty array of strings', 'invalid-allowed-tags');
			}

			const trimmedName = name.trim();
			if (await Partners.findOne({ name: trimmedName }, { projection: { _id: 1 } })) {
				return API.v1.failure('a partner with this name already exists', 'duplicate-name');
			}

			const now = new Date();
			const partner: Omit<IPartner, '_id'> = {
				name: trimmedName,
				partnerId: crypto.randomBytes(12).toString('hex'),
				// The partner signs external.register with this secret; it has no whitespace, so trimming on either side is harmless.
				partnerSecret: crypto.randomBytes(32).toString('base64url'),
				allowedTags: [...new Set(allowedTags.map((t: string) => t.trim()))],
				status: 'active',
				createdAt: now,
			};

			try {
				await Partners.insertOne(partner);
			} catch (e: any) {
				// The unique index on name catches a create that raced the check above.
				if (e?.code === 11000) {
					return API.v1.failure('a partner with this name already exists', 'duplicate-name');
				}
				throw e;
			}

			// The secret is stored (the HMAC check needs it) but returned only here.
			this.response.setHeader('Cache-Control', 'no-store');
			return API.v1.success({
				partnerId: partner.partnerId,
				name: partner.name,
				allowedTags: partner.allowedTags,
				status: partner.status,
				partnerSecret: partner.partnerSecret,
			});
		},
	},
);

API.v1.addRoute(
	'external.partners.setStatus',
	{ authRequired: true },
	{
		async post() {
			if (!(await hasPermissionAsync(this.userId, MANAGE_EXTERNAL_PARTNERS))) {
				return API.v1.unauthorized();
			}

			const { partnerId, status } = (this.bodyParams ?? {}) as PartnerParams;
			if (!STATUSES.includes(status as IPartner['status'])) {
				return API.v1.failure(`status must be one of: ${STATUSES.join(', ')}`, 'invalid-status');
			}
			if (!isNonEmptyString(partnerId)) {
				return API.v1.failure('partner not found', 'partner-not-found');
			}

			// An inactive partner can neither register users (verifyPartnerHMAC) nor log them in (verifyPartnerAssertion).
			const { matchedCount } = await Partners.updateOne({ partnerId }, { $set: { status: status as IPartner['status'], _updatedAt: new Date() } });
			if (!matchedCount) {
				return API.v1.failure('partner not found', 'partner-not-found');
			}

			return API.v1.success({ partnerId, status });
		},
	},
);
