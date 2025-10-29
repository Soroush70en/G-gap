import { Meteor } from 'meteor/meteor';
import type { IUser } from '@rocket.chat/core-typings';
import { Users, Rooms } from '@rocket.chat/models';
import { Subscriptions } from '../../../models/server'; // server-side model

const BOT_USERNAME = process.env.EXTERNAL_BOT_USERNAME || 'G.GapBot';

async function getUsernameById(userId: string): Promise<string | undefined> {
  const user = await Users.findOneById(userId, { projection: { username: 1 } });
  return user?.username as string | undefined;
}
async function getUserIdByUsername(username: string): Promise<string | undefined> {
  const user = await Users.findOneByUsername(username, { projection: { _id: 1 } });
  return user?._id ? String(user._id) : undefined;
}
async function getAdminId(): Promise<string> {
  const bot = await Users.findOneByUsername(BOT_USERNAME, { projection: { _id: 1 } });
  if (!bot?._id) throw new Error(`Bot user "${BOT_USERNAME}" not found`);
  return String(bot._id);
}

/** Ensure the DM room is visible (open subscription) for a specific user. */
async function ensureDMVisibleForUser(rid: string, uid: string) {
  // Try the same path the client uses
  await new Promise<void>((resolve) => {
    Meteor.runAsUser(uid, () => {
      try {
        (Meteor as any).callAsync?.('openRoom', rid) ?? Meteor.call('openRoom', rid);
      } catch {}
      resolve();
    });
  });

  // Hard guarantee: make sure a sub exists and is open.
  const sub = await Subscriptions.findOneByRoomIdAndUserId(rid, uid);
  if (!sub) {
    const [room, user] = await Promise.all([
      Rooms.findOneById(rid),
      Users.findOneById(uid, { projection: { username: 1, name: 1 } } as any),
    ]);
    if (room && user) {
      await Subscriptions.createWithRoomAndUser(room, user, {
        ts: room.ts || new Date(),
        open: true,
        alert: false,
      });
    }
  } else if (!sub.open) {
    await Subscriptions.openByRoomIdAndUserId(rid, uid);
  }
}

async function findUserBySalesOrg(salesTeamId: string, organizationId?: string, tag?: string) {
  const q: any = { 'customFields.salesTeamId': String(salesTeamId) };
  if (organizationId) q['customFields.organizationId'] = String(organizationId);
  if (tag) q['customFields.tag'] = String(tag);
  return Users.findOne(q, { projection: { _id: 1, username: 1 } } as any);
}

/** Find an existing DM rid between two users (u1<->u2). */
async function findDirectRidBetween(u1: string, u2: string): Promise<string | undefined> {
  // all subs for u1
  const cur: any = await (Subscriptions as any).findByUserId?.(u1, { projection: { rid: 1 } } as any)
                 ?? (Subscriptions as any).find?.({ 'u._id': u1 }, { projection: { rid: 1 } });
  const subs1 = Array.isArray(cur) ? cur
              : typeof cur?.toArray === 'function' ? await cur.toArray()
              : typeof cur?.fetch === 'function' ? cur.fetch()
              : [];

  for (const s of subs1) {
    const rid = String(s.rid);
    const room = await Rooms.findOneById(rid, { projection: { t: 1 } } as any);
    if (!room || room.t !== 'd') continue;
    const otherSub = await Subscriptions.findOneByRoomIdAndUserId(rid, u2, { projection: { _id: 1 } } as any);
    if (otherSub?._id) return rid;
  }
}

/** Remove a user from a DM, with fallbacks for strict 1:1 DMs. */
async function removeUserFromDMSafe(rid: string, userId: string) {
  const adminId = await getAdminId();
  const user = await Users.findOneById(userId);
  if (!user) return;
  // Try server-side removal
  try {
    await new Promise<void>((resolve) => {
      Meteor.runAsUser(adminId, () => {
        try { 
          Meteor.call('removeUserFromRoom', { rid, username: user?.username });
          console.log(`Success removing user ${user?.username} from ${rid} `);
         }
        catch(e) {
          console.error(`Error removing user ${user?.username} from ${rid} `, e);
          resolve();
          return;
        }
        resolve();
      });
    });
    return;
  } catch { /* fall through */ }

  // As a last resort: have the user hide/leave the DM so it vanishes from their UI
  await new Promise<void>((resolve) => {
    Meteor.runAsUser(userId, () => {
      try { Meteor.call('hideRoom', rid); } catch {}
      try { Meteor.call('leaveRoom', rid); } catch {}
      resolve();
    });
  });
}

/** If prev parent exists, remove the child from that previous DM. */
async function cleanupOldParentDM(
  childId: string,
  prevParentSalesTeamId?: string,
  organizationId?: string,
  tag?: string,
) {
  if (!prevParentSalesTeamId) return;
  const oldParent = await findUserBySalesOrg(prevParentSalesTeamId, organizationId, tag);
  if (!oldParent?._id) return;
  const rid = await findDirectRidBetween(childId, String(oldParent._id));
  if (!rid) return;
  await removeUserFromDMSafe(rid, childId);
}

/**
 * Create/ensure a 1:1 DM and make it visible for BOTH parties.
 * Preferred: run as the new user; fallback: run as admin.
 */
async function ensureDirectDM(newUserId: string, otherUser: Pick<IUser, '_id' | 'username'>, opts?: { prevParentSalesTeamId?: string; organizationId?: string; tag?: string },) {
	console.log('OTHER USER');
	console.log(otherUser);
	const otherUsernameRaw = otherUser?.username;
	const otherUsername = typeof otherUsernameRaw === 'string' ? otherUsernameRaw : '';
	if (!otherUsername) return;
  
	// Try as the target user (preferred)
	try {
	  const rid: string = await new Promise<string>((resolve, reject) => {
		Meteor.runAsUser(newUserId, () => {
		  // ✅ object form: { username }
		  Meteor.call('createDirectMessageIframe', otherUsername, (err: any, res: any) => {
			if (err || !res?.rid) return reject(err || new Meteor.Error('failed-to-create-dm'));
			resolve(res.rid);
		  });
		});
	  });
  
	  const otherId = otherUser._id || (await getUserIdByUsername(otherUsername));
	  if (otherId) {
		await ensureDMVisibleForUser(rid, newUserId);
		await ensureDMVisibleForUser(rid, otherId);
	  }
	  return;
	} catch (e: any) {
	  const code = e?.error || e?.errorType;
	  // Only fallback on permission-ish errors; otherwise bubble up
	  if (!['not-authorized', 'forbidden', 'error-not-allowed', 400].includes(code)) throw e;
	}
  
	// Fallback: create as admin with both users (object form: { usernames })
	const adminId = await getAdminId();
	const newUsername = await getUsernameById(newUserId);
	if (!newUsername) return;
  
	const rid: string = await new Promise<string>((resolve, reject) => {
	  Meteor.runAsUser(adminId, () => {
		Meteor.call(
		  'createDirectMessageIframe',
		  // ✅ object form: { usernames: [u1, u2] }
		  [String(newUsername), String(otherUsername)],
		  adminId,
		  (err: any, res: any) => {
			if (err || !res?.rid) return reject(err || new Meteor.Error('failed-to-create-dm-admin'));
			resolve(res.rid);
		  },
		);
	  });
	});
  
	const otherId = otherUser._id || (await getUserIdByUsername(otherUsername));
	if (otherId) {
	  await ensureDMVisibleForUser(rid, newUserId);
	  await ensureDMVisibleForUser(rid, otherId);
	}

  if (opts?.prevParentSalesTeamId) {
    // Only clean up if "otherUser" is the NEW parent; the caller will control when to pass prevParentSalesTeamId
    await cleanupOldParentDM(newUserId, opts.prevParentSalesTeamId, opts.organizationId, opts.tag);
  }
  }
  

/**
 * Link by sales team relations (parent + children) within the same org (+ optional tag),
 * ensuring the DMs are created and visible for both participants.
 */
export async function linkSalesTeamRelations(
  newUserId: string,
  parentId?: string,
  childrenIds?: string[],
  organizationId?: string,
  tag?: string,
  prevParentSalesTeamId?: string,
) {
  const pool = new Set<string>();
  if (parentId) pool.add(String(parentId));
  for (const cid of Array.isArray(childrenIds) ? childrenIds : []) pool.add(String(cid));
  if (!pool.size) return;

  const query: any = {
    _id: { $ne: newUserId },
    'customFields.salesTeamId': { $in: Array.from(pool) },
  };

  if (organizationId && String(organizationId).trim()) {
    query['customFields.organizationId'] = String(organizationId).trim();
  }
  if (tag && String(tag).trim()) {
    query['customFields.tag'] = String(tag).trim();
  }

  // Be resilient to RC cursor/Promise differences
  const matches = await (async () => {
    const cur = await (Users as any).find(query, { projection: { _id: 1, username: 1 } });
    if (Array.isArray(cur)) return cur;
    if (typeof cur?.toArray === 'function') return cur.toArray();
    if (typeof cur?.fetch === 'function') return cur.fetch();
    return [];
  })();

  for (const other of matches) {
    try {
      await ensureDirectDM(newUserId, other as any, {
        prevParentSalesTeamId,
          organizationId,
          tag,
      });
    } catch (e) {
      console.error('ensureDirectDM failed', e);
    }
  }
}
