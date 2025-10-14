// app/external/server/lib/userUpsert.ts
import { Users } from '@rocket.chat/models';

type UpsertInput = {
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

export async function upsertUser({
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
	let user = await Users.findOne(query, { projection: { customFields: 1 } });

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
			},
		};
		const insert = await Users.insertOne(doc);
		return { userId: String(insert.insertedId) };
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
