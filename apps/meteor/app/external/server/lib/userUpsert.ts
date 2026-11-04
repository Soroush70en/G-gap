// app/external/server/lib/userUpsert.ts
import { Users } from '@rocket.chat/models';

type UpsertInput = {
	partnerId: string;
	username?: string;
	email?: string;
	name?: string;
	roles?: string[];
	tag: string;
	metadata?: Record<string, any>;
	salesTeamId?: string;
	organizationId?: string;
	parentSalesTeamId?: string; // NEW
};

// A partner may only update users it created. Users created before ownership was recorded
// have no externalAuth; they are claimable only if 'sfa' is their sole role, never a regular RC user.
function isManagedByPartner(user: { roles?: string[]; customFields?: Record<string, any> }, partnerId: string) {
	const owner = user.customFields?.externalAuth?.partnerId;
	if (owner) {
		return owner === partnerId;
	}
	return Array.isArray(user.roles) && user.roles.length === 1 && user.roles[0] === 'sfa';
}

export async function upsertUser({
	partnerId,
	username,
	email,
	name,
	roles = ['user'],
	tag,
	metadata,
	salesTeamId,
	organizationId,
	parentSalesTeamId,
}: UpsertInput): Promise<{ userId: string; prevParentSalesTeamId?: string }> {
	if (!email && !username) throw new Error('username or email is required');

	const query: any = email ? { 'emails.address': email } : { username };
	let user = await Users.findOne(query, { projection: { customFields: 1, roles: 1 } });

	if (!user) {
		const doc: any = {
			type: 'user',
			active: true,
			name: name || username || email,
			username: username || email?.split('@')[0],
			roles,
			emails: email ? [{ address: email, verified: false }] : [],
			createdAt: new Date(),
			customFields: {
				tag,
				...(metadata ? { metadata } : {}),
				...(salesTeamId ? { salesTeamId } : {}),
				...(organizationId ? { organizationId } : {}),
				...(parentSalesTeamId ? { parentSalesTeamId } : {}),
				// Ownership is recorded at insert time; the key is added later by saveNewPermanentKey.
				externalAuth: { partnerId, status: 'pending', updatedAt: new Date() },
			},
		};
		const insert = await Users.insertOne(doc);
		return { userId: String(insert.insertedId) };
	}

	if (!isManagedByPartner(user, partnerId)) {
		throw new Error('user already exists and is not managed by this partner');
	}

	const prevParent = user.customFields?.parentSalesTeamId as string | undefined;

	await Users.updateOne(
		{ _id: user._id },
		{
			$set: {
				...(name ? { name } : {}),
				...(roles?.length ? { roles } : {}),
				'customFields.tag': tag,
				...(metadata ? { 'customFields.metadata': metadata } : {}),
				...(salesTeamId ? { 'customFields.salesTeamId': salesTeamId } : {}),
				...(organizationId ? { 'customFields.organizationId': organizationId } : {}),
				...(parentSalesTeamId !== undefined ? { 'customFields.parentSalesTeamId': parentSalesTeamId } : {}),
				updatedAt: new Date(),
			},
		},
	);

	return { userId: String(user._id), prevParentSalesTeamId: prevParent };
}
