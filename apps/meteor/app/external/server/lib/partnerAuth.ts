import crypto from 'crypto';
import type { IHttpRequest } from '@rocket.chat/core-typings';
import { Partners } from '@rocket.chat/models';

const PARTNER_ID = process.env.PARTNER_ID || 'acme';
const PARTNER_SECRET = process.env.PARTNER_SECRET || 'super-secret-shared-with-partner';
const ALLOWED_TAGS = (process.env.PARTNER_ALLOWED_TAGS || 'sfa').split(',');

export function getPartnerIdEnv() {
	return PARTNER_ID;
}

export async function verifyPartnerHMAC(req: IHttpRequest & { body?: any }) {
	const pid = String(req.headers['x-partner-id'] || '');
	const ts = String(req.headers['x-timestamp'] || '');
	const sig = String(req.headers['x-signature'] || '');

	if (!pid) throw new Error('missing partner id');

	const partner = await Partners.findOne({ partnerId: pid, status: 'active' });
    if (!partner) {
        throw new Error('bad or inactive partner');
    }

	const now = Math.floor(Date.now() / 1000);
	const t = Number(ts);
	if (!Number.isFinite(t) || Math.abs(now - t) > 300) throw new Error('stale');

	const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
	const bodyHash = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
	const toSign = `${(req.method || 'POST').toUpperCase()}|${req.url}|${ts}|${bodyHash}`;
    const expected = crypto.createHmac('sha256', partner.partnerSecret).update(toSign, 'utf8').digest('hex');

	if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
		throw new Error('bad signature');
	}

	(req as any).partner = partner;
}

export function ensureTagAllowed(tag?: string, req?: IHttpRequest) {
    const partner = (req as any)?.partner;
    if (!partner) {
        throw new Error('partner not verified');
    }

    if (!tag || !partner.allowedTags.includes(tag)) {
        throw new Error('tag not allowed for this partner');
    }
}
