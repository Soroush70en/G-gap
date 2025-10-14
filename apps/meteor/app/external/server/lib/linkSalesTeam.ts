// Add tag filtering and a fallback path if the new user can't create DMs.

import { Meteor } from 'meteor/meteor';
import type { IUser } from '@rocket.chat/core-typings';
import { Users } from '@rocket.chat/models';

const BOT_USERNAME = process.env.EXTERNAL_BOT_USERNAME || 'rocket.cat';

async function getUsernameById(userId: string): Promise<string | undefined> {
	const user = await Users.findOneById(userId, { projection: { username: 1 } });
	return user?.username as string | undefined;
}

async function getAdminId(): Promise<string> {
	const bot = await Users.findOneByUsername(BOT_USERNAME, { projection: { _id: 1 } });
	if (!bot?._id) throw new Error(`Bot user "${BOT_USERNAME}" not found`);
	return String(bot._id);
}

/**
 * Try as the user (preferred); if forbidden, fall back to admin creating DM between both.
 */
async function ensureDirectDM(newUserId: string, otherUser: Pick<IUser, '_id' | 'username'>) {
	const otherUsername = otherUser?.username;
	if (!otherUsername) return;

	// First attempt: run as the new user (keeps UX/subscriptions consistent)
	try {
		await new Promise<void>((resolve, reject) => {
			Meteor.runAsUser(newUserId, () => {
				try {
					const { rid } = Meteor.call('createDirectMessageIframe', otherUsername);
					if (!rid) throw new Meteor.Error('failed-to-create-dm');
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
		return;
	} catch (e: any) {
		// Fall through only for permission/forbidden errors; rethrow other errors if you want
	}

	// Fallback: run as admin and create DM between both users explicitly
	const adminId = await getAdminId();
	const newUsername = await getUsernameById(newUserId);
	if (!newUsername) return;

	await new Promise<void>((resolve, reject) => {
		Meteor.runAsUser(adminId, () => {
			try {
				// Standard RC method: accepts an array of usernames to DM together.
				const { rid } = Meteor.call('createDirectMessage', [newUsername, otherUsername]);
				if (!rid) throw new Meteor.Error('failed-to-create-dm-admin');
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	});
}

/**
 * Link by sales team relations (parent + children) within the same org (+ optional tag).
 */
export async function linkSalesTeamRelations(
	newUserId: string,
	parentId?: string,
	childrenIds?: string[],
	organizationId?: string,
	tag?: string, // <-- optional: pass from caller to avoid cross-tag linking
) {
	const pool = new Set<string>();
	if (parentId) pool.add(String(parentId));
	for (const cid of Array.isArray(childrenIds) ? childrenIds : []) pool.add(String(cid));
	if (!pool.size) return;

	const query: any = {
		'_id': { $ne: newUserId },
		'customFields.salesTeamId': { $in: Array.from(pool) },
	};

	if (organizationId && String(organizationId).trim()) {
		query['customFields.organizationId'] = String(organizationId).trim();
	} else {
		// If you MUST avoid cross-org links, bail when org is missing:
		// return;
	}

	if (tag && String(tag).trim()) {
		query['customFields.tag'] = String(tag).trim();
	}

	const matches = await Users.find(query, { projection: { _id: 1, username: 1 } }).toArray();

	// Simple sequential creation (easy & safe). For larger sets, parallelize with a small concurrency limit.
	for (const other of matches) {
		try {
			await ensureDirectDM(newUserId, other as any);
		} catch (e) {
			console.error('ensureDirectDM failed', e);
		}
	}
}
