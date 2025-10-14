// app/external/server/lib/grouping.ts
import { Meteor } from 'meteor/meteor';
import {
	Rooms,
	Team as TeamModel,
	TeamMember,
	Subscriptions,
	Users,
} from '@rocket.chat/models';
import { Team as TeamService } from '@rocket.chat/core-services';
import { TEAM_TYPE } from '@rocket.chat/core-typings';

const BOT_USERNAME = process.env.EXTERNAL_BOT_USERNAME || 'rocket.cat';

/** ----------------- small helpers ----------------- */
function slug(input: string) {
	return String(input).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
		teamName: `team-${base}`,
		groupName: `grp-${base}`,       // private discussion group
	};
}

/** ----------------- ensure resources ----------------- */
async function ensureTeam(teamName: string, adminId: string): Promise<string> {
	const existing = await TeamModel.findOneByName(teamName, { projection: { _id: 1 } } as any);
	if (existing?._id) return String(existing._id);

	await new Promise<void>((resolve, reject) => {
		Meteor.runAsUser(adminId, async () => {
			try {
				await TeamService.create(adminId, {
					team: { name: teamName, type: TEAM_TYPE.PRIVATE },
					members: [],
					owner: adminId,
				});
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	});

	const created = await TeamModel.findOneByName(teamName, { projection: { _id: 1 } } as any);
	if (!created?._id) throw new Error('failed to ensure team');
	return String(created._id);
}

async function ensurePrivateGroup(name: string, adminId: string): Promise<string> {
	const existing = await Rooms.findOneByName(name, { projection: { _id: 1 } } as any);
	if (existing?._id) return String(existing._id);

	await new Promise<void>((resolve, reject) => {
		Meteor.runAsUser(adminId, () => {
			try {
				Meteor.call('createPrivateGroup', name, [], true); // empty members; we'll add via diff
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

/** ----------------- membership helpers ----------------- */
async function addTeamMembers(teamId: string, userIds: string[], adminId: string) {
	if (!userIds.length) return;
	await new Promise<void>((resolve) => {
		Meteor.runAsUser(adminId, async () => {
			for (const uid of userIds) {
				console.log(`adding user ${uid} to team`);
				try {
					let res = await TeamService.addMember(adminId, { teamId, userId: uid });
					console.log(`team member add result is ${res}`);
				} catch (e) {
					console.error(`Error adding team member ${uid}`, e);
				}
			}
			resolve();
		});
	});
}

async function removeTeamMembers(teamId: string, userIds: string[], adminId: string) {
	if (!userIds.length) return;
	await new Promise<void>((resolve) => {
		Meteor.runAsUser(adminId, async () => {
			for (const uid of userIds) {
				try {
					await TeamService.removeMember(adminId, { teamId, userId: uid });
				} catch {}
			}
			resolve();
		});
	});
}

async function addRoomMembers(rid: string, userIds: string[], adminId: string) {
	if (!userIds.length) return;
	await new Promise<void>((resolve) => {
		Meteor.runAsUser(adminId, () => {
			for (const uid of userIds) {
				console.log(`adding user ${uid} to group`);
				try {
					Meteor.call('addUserToRoom', { rid, userId: uid });
				} catch (e) {
					console.error(`Error adding group member ${uid}`, e);
				}
			}
			resolve();
		});
	});
}

async function removeRoomMembers(rid: string, userIds: string[], adminId: string) {
	if (!userIds.length) return;
	await new Promise<void>((resolve) => {
		Meteor.runAsUser(adminId, () => {
			for (const uid of userIds) {
				try {
					Meteor.call('removeUserFromRoom', { rid, userId: uid });
				} catch {}
			}
			resolve();
		});
	});
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
	const kids = await childrenCursor.toArray();

	const ids = [parent?._id, ...kids.map((k: any) => k._id)]
		.filter(Boolean)
		.map(String);

	return Array.from(new Set(ids));
}

/** ----------------- main entry ----------------- */
export async function reconcileParentGroup(ctx: {
	tag: string;
	organizationId: string;
	parentId: string;
}) {
	const adminId = await requireBotUserId();
	const { teamName, groupName } = names(ctx);

	// Ensure resources exist
	const teamId = await ensureTeam(teamName, adminId);
	const groupRid = await ensurePrivateGroup(groupName, adminId);

	// Desired members (parent + all children)
	const desired = await computeDesiredMembers(ctx);
	console.log('desired users');
	console.log(desired);
	// Team membership
	const teamMembers = await TeamMember.findByTeamId(teamId).toArray();
	const currentTeam = teamMembers.map((m: any) => String(m.userId));
	{
		const { toAdd, toRemove } = diff(desired, currentTeam);
		await addTeamMembers(teamId, toAdd, adminId);
		await removeTeamMembers(teamId, toRemove, adminId);
	}

	// Group membership
	const groupSubs = await Subscriptions.findByRoomId(groupRid, { projection: { 'u._id': 1 } } as any).toArray();
	const currentGroup = groupSubs.map((s: any) => String(s.u._id));
	{
		const { toAdd, toRemove } = diff(desired, currentGroup);
		await addRoomMembers(groupRid, toAdd, adminId);
		await removeRoomMembers(groupRid, toRemove, adminId);
	}
}
