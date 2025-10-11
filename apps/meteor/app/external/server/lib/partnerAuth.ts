import crypto from 'crypto';
import type { IHttpRequest } from '@rocket.chat/core-typings';
import { Partners } from '../../../models/server';
import { Meteor } from 'meteor/meteor';

export async function verifyPartnerHMAC(req: IHttpRequest & { body?: any }) {
	const pid = String(req.headers['x-partner-id'] || '');
	const ts = String(req.headers['x-timestamp'] || '');
	const sig = String(req.headers['x-signature'] || '');
	if (!pid) throw new Meteor.Error('no-partner-id', 'missing partner id');
	
	const partner = await Partners.findOneByPartnerId(pid);
	console.log(partner);
	if (!partner) {
		throw new Meteor.Error('partner-not-found', 'bad or inactive partner');
	}
	req.partner = partner;
	const now = Math.floor(Date.now() / 1000);
	const t = Number(ts);
	if (!Number.isFinite(t) || Math.abs(now - t) > 300) throw new Error('stale');

	const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
	const bodyHash = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
	const toSign = `${(req.method || 'POST').toUpperCase()}|${req.url}|${ts}|${bodyHash}`;
	const expected = crypto.createHmac('sha256', partner.partnerSecret).update(toSign, 'utf8').digest('hex');
	console.log(expected);
	console.log(sig);

	if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
		throw new Meteor.Error('bad-signature', 'bad signature');
	}

	(req as any).partner = partner;
}

export function ensureTagAllowed(tag?: string, req?: IHttpRequest) {
	const partner = (req as any)?.partner;
	if (!partner) {
		throw new Meteor.Error('partner-not-verified', 'partner not verified');
	}

	if (!tag || !partner.allowedTags.includes(tag)) {
		throw new Meteor.Error('tag-not-allowed', 'tag not allowed for this partner');
	}
}
