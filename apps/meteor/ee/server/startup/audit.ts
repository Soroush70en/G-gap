import { Meteor } from 'meteor/meteor';

import { createPermissions } from '../lib/audit/startup';

//onLicense('auditing', async () => 
{
	await import('../lib/audit/methods');

	Meteor.startup(() => {
		createPermissions();
	});
}
//);
