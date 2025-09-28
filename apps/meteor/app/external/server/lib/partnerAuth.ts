import crypto from 'crypto';
import type { IHttpRequest } from '@rocket.chat/core-typings';

const PARTNER_ID = process.env.PARTNER_ID || 'acme';
const PARTNER_SECRET = process.env.PARTNER_SECRET || 'super-secret-shared-with-partner';
const ALLOWED_TAGS = (process.env.PARTNER_ALLOWED_TAGS || 'sfa').split(',');

export function getPartnerIdEnv() {
	return PARTNER_ID;
}

export function verifyPartnerHMAC(req: IHttpRequest & { body?: any }) {
	const pid = String(req.headers['x-partner-id'] || '');
	const ts = String(req.headers['x-timestamp'] || '');
	const sig = String(req.headers['x-signature'] || '');

	if (pid !== PARTNER_ID) throw new Error('bad partner');

	const now = Math.floor(Date.now() / 1000);
	const t = Number(ts);
	if (!Number.isFinite(t) || Math.abs(now - t) > 300) throw new Error('stale');

	const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
	const bodyHash = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
	const toSign = `${(req.method || 'POST').toUpperCase()}|${req.url}|${ts}|${bodyHash}`;
	const expected = crypto.createHmac('sha256', PARTNER_SECRET).update(toSign, 'utf8').digest('hex');

	if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
		throw new Error('bad signature');
	}
}

export function ensureTagAllowed(tag?: string) {
	if (!tag || !ALLOWED_TAGS.includes(tag)) throw new Error('tag not allowed');
}
