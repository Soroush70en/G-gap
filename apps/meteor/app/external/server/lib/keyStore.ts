import crypto from 'crypto';
import { Users } from '@rocket.chat/models';

const SERVER_MASTER_KEY = process.env.EXTERNAL_KEY_SERVER_MASTER || 'rotate-me'; // 32+ bytes recommended

// ---- helpers: AES-GCM pack(iv|tag|ct) -> base64url ----
function aesKeyFromSecret(secret: string) {
	return crypto.createHash('sha256').update(secret, 'utf8').digest(); // 32 bytes
}
function aesGcmEncryptRaw(key: Buffer, plaintext: Buffer) {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, ct]).toString('base64url'); // iv|tag|ct
}
function aesGcmDecryptRaw(key: Buffer, packedB64Url: string) {
	const buf = Buffer.from(packedB64Url, 'base64url');
	const iv = buf.subarray(0, 12);
	const tag = buf.subarray(12, 28);
	const ct = buf.subarray(28);
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(ct), decipher.final()]);
}

// ---- public API ----
export function generateUserKey(): string {
	return crypto.randomBytes(32).toString('base64url');
}

function hashForLookup(plain: string) {
	// Non-reversible fingerprint for future comparisons if needed
	return crypto
		.createHmac('sha256', SERVER_MASTER_KEY)
		.update('fp:' + plain, 'utf8')
		.digest('hex');
}

export async function loadExistingKeyRecord(userId: string) {
	const user = await Users.findOneById(userId, { projection: { customFields: 1 } });
	const rec = user?.customFields?.externalAuth as
		| undefined
		| {
				partnerId: string;
				tag: string;
				kid: string;
				enc: string;
				fp: string;
				status: string;
				updatedAt: Date;
		  };
	return rec;
}

export function decryptUserKeyFromRecord(rec: { enc: string }) {
	const key = aesKeyFromSecret(SERVER_MASTER_KEY);
	const plain = aesGcmDecryptRaw(key, rec.enc);
	return plain.toString('utf8');
}

export async function saveNewPermanentKey(userId: string, partnerId: string, tag: string, keyPlain: string, kid = 'v1') {
	const key = aesKeyFromSecret(SERVER_MASTER_KEY);
	const enc = aesGcmEncryptRaw(key, Buffer.from(keyPlain, 'utf8'));
	const fp = hashForLookup(keyPlain);
	await Users.updateOne(
		{ _id: userId },
		{ $set: { 'customFields.externalAuth': { partnerId, tag, kid, enc, fp, status: 'active', updatedAt: new Date() } } },
	);
}

export function encryptForPartnerTransport(keyPlain: string, partnerSecret: string) {
	const partnerAes = aesKeyFromSecret(partnerSecret);
	return aesGcmEncryptRaw(partnerAes, Buffer.from(keyPlain, 'utf8'));
}
