import { getCollectionName } from '@rocket.chat/models';

import { db } from '../../../../server/database/utils';

type UsedAssertion = {
	_id: string; // `${partnerId}:${jti}`
	expireAt: Date;
};

const collection = db.collection<UsedAssertion>(getCollectionName('external_used_assertions'));

// Mongo removes a record once its assertion can no longer pass the exp check.
collection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }).catch((e) => {
	console.error('external_used_assertions: could not create TTL index', e);
});

/**
 * Records a jti as used. Returns false if it was already used (replay).
 * The unique _id makes this safe across several server instances.
 */
export async function consumeAssertionId(partnerId: string, jti: string, expireAt: Date): Promise<boolean> {
	try {
		await collection.insertOne({ _id: `${partnerId}:${jti}`, expireAt });
		return true;
	} catch (e: any) {
		if (e?.code === 11000) {
			return false;
		}
		throw e;
	}
}
