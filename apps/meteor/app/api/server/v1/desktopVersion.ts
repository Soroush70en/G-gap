import { API } from '../api'; // Rocket.Chat API helper if you use it
import { parseUserAgent, needsUpgrade } from '../helpers/userAgent';
import { getLatestVersion } from '../helpers/versionService';

API.v1.addRoute(
	'desktop.version-check',
	{ authRequired: false },
	{
		async get() {
			const info = parseUserAgent(this.request.headers['user-agent'] as string | undefined);
			const latest = await getLatestVersion();
			let decision: 'ok' | 'warn' | 'force' = 'ok';

			if (latest && info.isElectron && info.appVersion) {
				if (info.isElectron && info.appVersion) {
					if (needsUpgrade(info.appVersion, latest.versionName)) {
						// If current version is less than the required version
						if (latest.forceUpdate) {
							decision = 'force'; // Force upgrade if required
						} else {
							decision = 'warn'; // Warn if only outdated
						}
					}
				}
			}

			return {
				status: 'success',
				data: {
					platform: info.isElectron ? 'electron' : 'web',
					current: info.appVersion,
					latest: latest?.versionName ?? null,
					forceUpdate: latest?.forceUpdate ?? false,
					decision,
					download: latest?.windows ?? null,
				},
			};
		},
	},
);
