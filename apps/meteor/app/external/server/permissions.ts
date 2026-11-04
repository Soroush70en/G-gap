import { Meteor } from 'meteor/meteor';
import { Permissions } from '@rocket.chat/models';

export const MANAGE_EXTERNAL_PARTNERS = 'manage-external-partners';

// upsertPermissions runs only on a fresh install, so module permissions are created here on every startup.
// Permissions.create does nothing if the permission exists, so role changes made by an admin are kept.
Meteor.startup(async () => {
	await Permissions.create(MANAGE_EXTERNAL_PARTNERS, ['admin']);
});
