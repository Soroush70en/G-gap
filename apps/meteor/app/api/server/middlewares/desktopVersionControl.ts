import { WebApp } from 'meteor/webapp';
import type { Request, Response, NextFunction } from 'express';
import { parseUserAgent, isOutdated, needsUpgrade } from '../helpers/userAgent';
import { getLatestVersion } from '../helpers/versionService';

WebApp.connectHandlers.use(async function (req: Request, res: Response, next: NextFunction) {
	const info = parseUserAgent(req.headers['user-agent']);
	if (info.isElectron) {
		let decision: 'ok' | 'warn' | 'force' = 'ok';
		let latestName: string | null = null;

		const latest = await getLatestVersion();
		if (latest) {
			latestName = latest.versionName;
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
	}
	next();
});
