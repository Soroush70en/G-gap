import { Meteor } from 'meteor/meteor';
import type { IUser } from '@rocket.chat/core-typings';
import { Users } from '@rocket.chat/models';

/**
 * Create (or ensure) a 1:1 DM between two users by calling RC's own method.
 * We run it as `newUserId` so room naming/subscriptions are correct.
 */
async function ensureDirectDM(newUserId: string, otherUser: Pick<IUser, '_id' | 'username'>) {
	if (!otherUser?.username) return;
	console.log('trying to create direct message');
	await new Promise<void>((resolve, reject) => {
		Meteor.runAsUser(newUserId, () => {
			const { rid } = Meteor.call('createDirectMessageIframe', otherUser.username);
			if (!rid) {
				throw new Meteor.Error('failed to create room');
			} else {
				console.log('rid', rid);
				resolve();
			}
		});
	});
}

import { Users } from '@rocket.chat/models';

// ...

/**
 * Find users whose:
 *   - customFields.salesTeamId ∈ { parentId, ...childrenIds }
 *   - AND (if provided) customFields.externalFields.organizationId === organizationId
 * Then create 1:1 DMs with newUserId.
 */
export async function linkSalesTeamRelations(
  newUserId: string,
  parentId?: string,
  childrenIds?: string[],
  organizationId?: string,
) {
  const ids = [
    ...(parentId ? [String(parentId)] : []),
    ...((Array.isArray(childrenIds) ? childrenIds : []).map(String)),
  ];
  if (!ids.length) return;

  const query: any = {
    _id: { $ne: newUserId },
    'customFields.salesTeamId': { $in: ids },
  };

  // Require org match when provided
  if (organizationId && String(organizationId).trim().length > 0) {
    query['customFields.organizationId'] = String(organizationId);
  }

  const cursor = Users.find(query, { projection: { _id: 1, username: 1 } });
  const matches = await cursor.toArray();

  for (const other of matches) {
    try {
      await ensureDirectDM(newUserId, other as any);
    } catch (e) {
      console.error('ensureDirectDM failed', e);
    }
  }
}

