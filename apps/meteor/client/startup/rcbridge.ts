import type { IUser } from '@rocket.chat/core-typings';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';

import { APIClient } from '../../app/utils/client';

type AppTheme = 'light' | 'dark';

const isAppTheme = (value: unknown): value is AppTheme => value === 'light' || value === 'dark';

// Theme last sent by the SFA app in RC_CONTEXT. The app's theme wins over the stored user preference.
const appTheme = new ReactiveVar<AppTheme | undefined>(undefined);

const applyAppTheme = (theme: AppTheme): void => {
	// Read by custom components that do not use useThemeMode (e.g. the sidebar header tabs).
	document.documentElement.setAttribute('data-theme', theme);
	appTheme.set(theme);
};

Meteor.startup(() => {
	window.addEventListener('message', (e) => {
		const m = e.data || {};

		if (m.type === 'RC_CONTEXT' && isAppTheme(m.theme)) {
			applyAppTheme(m.theme);
		}

		if (m.type === 'RC_REQUEST_REVIEWED') {
			(window as any).RCBridge?.postMessage(JSON.stringify(m));
		}
	});

	// Persist the app's theme as the user's themeAppearence preference, which drives the RC palette (useThemeMode).
	Tracker.autorun(() => {
		const theme = appTheme.get();
		const user = Meteor.user() as IUser | null;
		if (!theme || !user || user.settings?.preferences?.themeAppearence === theme) {
			return;
		}

		APIClient.post('/v1/users.setPreferences', { data: { themeAppearence: theme } }).catch((error) => {
			console.error('[rcbridge] Failed to apply app theme', { theme, error });
		});
	});
});
