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
  organizationId?: string; // <-- NEW
};

export async function upsertUser({
  username,
  email,
  name,
  roles = ['user'],
  tag,
  metadata,
  salesTeamId,
  organizationId, // <-- NEW
}: UpsertInput) {
  if (!email && !username) throw new Error('username or email is required');

  const query: any = email ? { 'emails.address': email } : { username };
  let user = await Users.findOne(query);

  if (!user) {
    const doc: any = {
      type: 'user',
      active: true,
      name: name || username || email,
      username: username || (email?.split('@')[0]),
      roles,
      emails: email ? [{ address: email, verified: false }] : [],
      createdAt: new Date(),
      customFields: {
        tag,
        ...(metadata ? { metadata } : {}),
        ...(salesTeamId ? { salesTeamId } : {}),
        ...(organizationId ? { organizationId } : {}), // <-- NEW
      },
    };
    const insert = await Users.insertOne(doc);
    return String(insert.insertedId);
  }

  // Update paths safely (don’t overwrite whole objects)
  await Users.updateOne(
    { _id: user._id },
    {
      $set: {
        ...(name ? { name } : {}),
        ...(roles?.length ? { roles } : {}),
        'customFields.tag': tag,
        ...(metadata ? { 'customFields.metadata': metadata } : {}),
        ...(salesTeamId ? { 'customFields.salesTeamId': salesTeamId } : {}),
        ...(organizationId
          ? { 'customFields.organizationId': organizationId }
          : {}),
        updatedAt: new Date(),
      },
    },
  );

  return String(user._id);
}
