import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
	window.addEventListener('message', (e) => {
		const m = e.data || {};

		if (m.type === 'RC_REQUEST_REVIEWED') {
			console.log('RC_REQUEST_REVIEWED received');
			RCBridge?.postMessage(JSON.stringify(m));
		}
	});
});
