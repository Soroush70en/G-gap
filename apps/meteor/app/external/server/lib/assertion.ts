import crypto from 'crypto';
import { Meteor } from 'meteor/meteor';
import { Partners } from '@rocket.chat/models';

export const ASSERTION_AUDIENCE = 'ggap-messenger';
const CLOCK_LEEWAY_SECONDS = 30;
const MAX_LIFETIME_SECONDS = 300;

export type PartnerAssertionClaims = {
	iss: string;
	sub: string;
	aud: string | string[];
	iat: number;
	exp: number;
	nbf?: number;
	jti: string;
	tag: string;
};

function fail(code: string, reason: string): never {
	throw new Meteor.Error(code, reason);
}

function decodeJson(part: string): any {
	try {
		return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
	} catch {
		return fail('assertion-malformed', 'assertion is not a valid JWT');
	}
}

const isNonEmptyString = (v: unknown, max = 256): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

/**
 * Verifies a partner login assertion: a compact JWT signed with ES256 by the partner's private key.
 * Only checks the token itself; the caller checks that `sub` is a user owned by `iss`.
 */
export async function verifyPartnerAssertion(token: unknown): Promise<PartnerAssertionClaims> {
	if (!isNonEmptyString(token, 4096)) {
		fail('assertion-malformed', 'assertion is missing');
	}

	const parts = token.split('.');
	if (parts.length !== 3) {
		fail('assertion-malformed', 'assertion is not a valid JWT');
	}
	const [encodedHeader, encodedPayload, encodedSignature] = parts;

	const header = decodeJson(encodedHeader);
	const claims = decodeJson(encodedPayload);

	// The algorithm is fixed here, never taken from the header, so "none" or HS256 tokens are rejected.
	if (header?.alg !== 'ES256' || !isNonEmptyString(header?.kid)) {
		fail('assertion-malformed', 'unsupported JWT header');
	}
	if (!isNonEmptyString(claims?.iss)) {
		fail('assertion-malformed', 'iss is missing');
	}

	const partner = await Partners.findOne({ partnerId: claims.iss }, { projection: { status: 1, publicKeys: 1, allowedTags: 1 } });
	const key = partner?.publicKeys?.find((k) => k.kid === header.kid && k.status === 'active');
	// Only an explicit 'inactive' blocks: partners created before external.partners.create may have no status field.
	if (!partner || partner.status === 'inactive' || !key) {
		fail('partner-not-authorized', 'unknown partner or key');
	}

	const signatureValid = crypto.verify(
		'sha256',
		Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf8'),
		{ key: crypto.createPublicKey(key.pem), dsaEncoding: 'ieee-p1363' },
		Buffer.from(encodedSignature, 'base64url'),
	);
	if (!signatureValid) {
		fail('bad-signature', 'assertion signature is invalid');
	}

	// Claims are trusted only after the signature check.
	const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
	if (!audiences.includes(ASSERTION_AUDIENCE)) {
		fail('assertion-malformed', 'wrong audience');
	}
	if (!isNonEmptyString(claims.sub) || !isNonEmptyString(claims.jti, 128) || !isNonEmptyString(claims.tag)) {
		fail('assertion-malformed', 'sub, jti or tag is missing');
	}
	if (!Number.isFinite(claims.iat) || !Number.isFinite(claims.exp)) {
		fail('assertion-malformed', 'iat or exp is missing');
	}

	const now = Math.floor(Date.now() / 1000);
	if (claims.exp + CLOCK_LEEWAY_SECONDS < now) {
		fail('assertion-expired', 'assertion expired');
	}
	if (claims.iat - CLOCK_LEEWAY_SECONDS > now || (claims.nbf !== undefined && claims.nbf - CLOCK_LEEWAY_SECONDS > now)) {
		fail('assertion-not-yet-valid', 'assertion is not valid yet');
	}
	if (claims.exp - claims.iat > MAX_LIFETIME_SECONDS) {
		fail('assertion-malformed', 'assertion lifetime is too long');
	}

	if (Array.isArray(partner.allowedTags) && !partner.allowedTags.includes(claims.tag)) {
		fail('partner-not-authorized', 'tag not allowed for this partner');
	}

	return claims as PartnerAssertionClaims;
}

export function assertionReplayExpiry(claims: PartnerAssertionClaims): Date {
	return new Date((claims.exp + CLOCK_LEEWAY_SECONDS) * 1000);
}
