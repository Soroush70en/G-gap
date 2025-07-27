import { Meteor } from 'meteor/meteor';

import LivechatTag from '../../models/server/models/LivechatTag';
import LivechatUnit from '../../models/server/models/LivechatUnit';
import LivechatUnitMonitors from '../../models/server/models/LivechatUnitMonitors';
import './business-hour';
import './hooks/afterOnHold';
import './hooks/afterTakeInquiry';
import './hooks/beforeNewInquiry';
import './hooks/beforeNewRoom';
import './hooks/beforeRoutingChat';
import './hooks/checkAgentBeforeTakeInquiry';
import './hooks/handleNextAgentPreferredEvents';
import './hooks/onCheckRoomParamsApi';
import './hooks/onCloseLivechat';
import './hooks/onLoadConfigApi';
import './hooks/onSaveVisitorInfo';
import './hooks/onTransferFailure';
import './hooks/resumeOnHold';
import './hooks/scheduleAutoTransfer';
import './lib/AutoCloseOnHoldScheduler';
import './lib/routing/LoadBalancing';
import './lib/routing/LoadRotation';
import './methods/addMonitor';
import './methods/getUnitsFromUserRoles';
import './methods/removeBusinessHour';
import './methods/removeMonitor';
import './methods/removeTag';
import './methods/removeUnit';
import './methods/resumeOnHold';
import './methods/saveTag';
import './methods/saveUnit';
import { createDefaultPriorities } from './priorities';

//onLicense('livechat-enterprise', async () => {
	require('./api');
	require('./hooks');
	await import('./startup');
	const { createPermissions } = await import('./permissions');
	const { createSettings } = await import('./settings');

	Meteor.startup(function () {
		createSettings();
		createPermissions();
		createDefaultPriorities();
	});
//});

export { LivechatTag, LivechatUnit, LivechatUnitMonitors };

