// app/external/server/lib/grouping.ts
import { Meteor } from 'meteor/meteor';
import { Rooms, Users } from '@rocket.chat/models';
import { Subscriptions } from '../../../models/server'; // RC internal server models (has createWithRoomAndUser etc.)

const BOT_USERNAME = process.env.EXTERNAL_BOT_USERNAME || 'G.GapBot';

/** ----------------- small helpers ----------------- */
function slug(input: string) {
	return String(input)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

async function requireBotUserId(): Promise<string> {
	const bot = await Users.findOneByUsername(BOT_USERNAME, { projection: { _id: 1 } });
	if (!bot?._id) {
		throw new Error(`Privileged bot user "${BOT_USERNAME}" not found`);
	}
	return String(bot._id);
}

function names(ctx: { tag: string; organizationId: string; parentId: string }) {
	const base = `${slug(ctx.tag)}-${slug(ctx.organizationId)}-${slug(ctx.parentId)}`;
	return {
		groupName: `group-${base}`, // writable discussion
		castName: `channel-${base}`, // read-only broadcast
	};
}

/** ----------------- ensure resources ----------------- */
async function ensurePrivateGroup(name: string, adminId: string): Promise<string> {
	const existing = await Rooms.findOneByName(name, { projection: { _id: 1, ro: 1 } } as any);
	if (existing?._id) {
		// If previously created as read-only, flip to writable
		if ((existing as any).ro === true) {
			await new Promise<void>((resolve) => {
				Meteor.runAsUser(adminId, () => {
					try {
						Meteor.call('saveRoomSettings', existing._id, 'readOnly', false);
					} catch {}
					resolve();
				});
			});
		}
		return String(existing._id);
	}

	// Create writable private group (no readOnly)
	await new Promise<void>((resolve, reject) => {
		Meteor.runAsUser(adminId, () => {
			try {
				// Some RC versions accept (name, members, readOnly:boolean). If not, it's ignored.
				try {
					Meteor.call('createPrivateGroup', name, [], false);
				} catch {
					Meteor.call('createPrivateGroup', name, []);
				}
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	});

	const g = await Rooms.findOneByName(name, { projection: { _id: 1 } } as any);
	if (!g?._id) throw new Error('failed to ensure private group');
	return String(g._id);
}

async function ensureBroadcastChannel(name: string, adminId: string): Promise<string> {
	const existing = await Rooms.findOneByName(name, { projection: { _id: 1 } } as any);
	if (existing?._id) return String(existing._id);

	await new Promise<void>((resolve, reject) => {
		Meteor.runAsUser(adminId, () => {
			try {
				// readOnly + broadcast => only owners/mods can post
				Meteor.call('createPrivateGroup', name, [], false, { readOnly: true, broadcast: true });
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	});

	// Double-set in case createChannel didn't persist options in your version
	const c = await Rooms.findOneByName(name, { projection: { _id: 1 } } as any);
	if (!c?._id) throw new Error('failed to ensure broadcast channel');

	await new Promise<void>((resolve) => {
		Meteor.runAsUser(adminId, () => {
			try {
				Meteor.call('saveRoomSettings', c._id, 'readOnly', true);
			} catch {}
			try {
				Meteor.call('saveRoomSettings', c._id, 'broadcast', true);
			} catch {}
			resolve();
		});
	});

	return String(c._id);
}

/** ----------------- membership helpers ----------------- */
async function addRoomMembers(rid: string, userIds: string[], adminId: string) {
	if (!userIds.length) return;
	await new Promise<void>((resolve) => {
		Meteor.runAsUser(adminId, () => {
			for (const uid of userIds) {
				try {
					Meteor.call('addUserToRoom', { rid, userId: uid });
				} catch (e) {
					console.error(`Error adding member ${uid} to room ${rid}`, e);
				}
			}
			resolve();
		});
	});
}

async function removeRoomMembers(rid: string, userIds: string[], adminId: string) {
	if (!userIds.length) return;

	await new Promise<void>((resolve, reject) => {
		Meteor.runAsUser(adminId, async () => {
			try {
				for (const uid of userIds) {
					if (uid === 'rocket.cat') continue;
					const user = await Users.findOneById(uid, { projection: { username: 1 } } as any);
					if (!user?.username) continue;
					try {
						Meteor.call('removeUserFromRoom', { rid, username: user.username });
					} catch (e) {
						console.error(`Error removing user ${uid} from ${rid}`, e);
					}
				}
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	});
}

/**
 * Ensure each user has a Subscription for rid and mark it as open (visible in sidebar).
 */
async function forceRoomVisibleForUsers(rid: string, userIds: string[]) {
	const room = await Rooms.findOneById(rid);
	if (!room) throw new Error('Room not found');

	for (const uid of userIds) {
		const user = await Users.findOneById(uid);
		if (!user) continue;

		// 1) Ensure a subscription exists (create if missing)
		const existing = await Subscriptions.findOneByRoomIdAndUserId(rid, uid);
		if (!existing) {
			await Subscriptions.createWithRoomAndUser(room, user, {
				ts: room.ts || new Date(),
				open: true,
				alert: false,
			});
		}

		// 2) Mark as open so it appears in the UI
		await new Promise<void>((resolve) => {
			Meteor.runAsUser(uid, () => {
				try {
					// openRoom also creates sub if missing in some versions
					(Meteor as any).callAsync?.('openRoom', rid) ?? Meteor.call('openRoom', rid);
				} catch {}
				resolve();
			});
		});
	}
}

/**
 * Make user an owner of the room (needed so parent can post in broadcast room).
 */
async function ensureRoomOwner(rid: string, userId: string) {
	// no-op if already owner
	const sub = await Subscriptions.findOneByRoomIdAndUserId(rid, userId, { projection: { roles: 1 } } as any);
	if (sub?.roles?.includes('owner')) return;

	const adminId = await requireBotUserId();
	const user = await Users.findOneById(userId, { projection: { username: 1 } } as any);
	if (!user?.username) return;

	await new Promise<void>((resolve) => {
		Meteor.runAsUser(adminId, () => {
			try {
				// Try object form first; fall back to positional
				try {
					Meteor.call('addRoomOwner', rid, userId);
				} catch (e) {
					console.error('error adding room owner', e);
					Meteor.call('addRoomOwner', rid, user?.username);
				}
			} catch (e) {
				console.error('Error adding room owner', e);
			}
			resolve();
		});
	});
}

/** parent → owner of broadcast */
async function ensureParentIsBroadcastOwner(castRid: string, ctx: { organizationId: string; parentId: string }) {
	const parent = await Users.findOne(
		{
			'customFields.salesTeamId': String(ctx.parentId),
			'customFields.organizationId': String(ctx.organizationId),
		},
		{ projection: { _id: 1 } } as any,
	);
	console.log('PARENT');
	console.log(parent);
	if (!parent?._id) return;
	// make sure parent is a member and sees the room
	await addRoomMembers(castRid, [String(parent._id)], await requireBotUserId());
	await forceRoomVisibleForUsers(castRid, [String(parent._id)]);

	// then grant owner
	await ensureRoomOwner(castRid, String(parent._id));
}

/** ----------------- desired state & diff ----------------- */
function diff<T extends string>(want: T[], have: T[]) {
	const wantSet = new Set(want);
	const haveSet = new Set(have);
	const toAdd = want.filter((x) => !haveSet.has(x));
	const toRemove = have.filter((x) => !wantSet.has(x));
	return { toAdd, toRemove };
}

async function computeDesiredMembers(ctx: { organizationId: string; parentId: string }) {
	const parent = await Users.findOne(
		{
			'customFields.salesTeamId': String(ctx.parentId),
			'customFields.organizationId': String(ctx.organizationId),
		},
		{ projection: { _id: 1 } },
	);

	const childrenCursor = Users.find(
		{
			'customFields.parentSalesTeamId': String(ctx.parentId),
			'customFields.organizationId': String(ctx.organizationId),
		},
		{ projection: { _id: 1 } },
	);
	const kids = (await childrenCursor.toArray?.()) ?? (await (childrenCursor as any)?.fetch?.()) ?? [];

	const ids = [parent?._id, ...kids.map((k: any) => k._id)].filter(Boolean).map(String);
	return Array.from(new Set(ids));
}

async function asArray<T>(maybe: any): Promise<T[]> {
	const value = await maybe; // unwrap promise
	if (!value) return [];
	if (Array.isArray(value)) return value; // already array
	if (typeof value.toArray === 'function') return value.toArray(); // cursor
	if (typeof value.fetch === 'function') return value.fetch(); // Meteor cursor
	return [];
}

/** ----------------- main entry ----------------- */
export async function reconcileParentGroup(ctx: { tag: string; organizationId: string; parentId: string }) {
	const adminId = await requireBotUserId();
	const { groupName, castName } = names(ctx);

	// Ensure resources exist
	const groupRid = await ensurePrivateGroup(groupName, adminId); // writable discussion
	const castRid = await ensureBroadcastChannel(castName, adminId); // read-only broadcast

	// Desired members (parent + all children)
	const desired = await computeDesiredMembers(ctx);

	// GROUP (discussion) membership
	const groupSubs = await asArray<{ u: { _id: string } }>(Subscriptions.findByRoomId(groupRid, { projection: { 'u._id': 1 } } as any));
	const currentGroup = groupSubs.map((s) => String(s.u._id));
	{
		const { toAdd, toRemove } = diff(desired, currentGroup);
		await addRoomMembers(groupRid, toAdd, adminId);
		await removeRoomMembers(groupRid, toRemove, adminId);
		await forceRoomVisibleForUsers(groupRid, toAdd);
	}

	// BROADCAST membership
	const castSubs = await asArray<{ u: { _id: string } }>(Subscriptions.findByRoomId(castRid, { projection: { 'u._id': 1 } } as any));
	const currentCast = castSubs.map((s) => String(s.u._id));
	{
		const { toAdd, toRemove } = diff(desired, currentCast);
		await addRoomMembers(castRid, toAdd, adminId);
		await removeRoomMembers(castRid, toRemove, adminId);
		await forceRoomVisibleForUsers(castRid, toAdd);

		// Make the parent the owner so they can post in read-only broadcast
		await ensureParentIsBroadcastOwner(castRid, { organizationId: ctx.organizationId, parentId: ctx.parentId });
	}
}
