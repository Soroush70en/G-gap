import fetch from 'node-fetch';
type LatestVersion = {
	versionName: string; // "1.0.7"
	versionCode: number; // 8 (optional for you)
	forceUpdate: boolean; // true -> hard block old clients
	windows?: string; // "/uploads/files/applications/G-Gap-1.0.7-win-x64.exe"
	webApp?: string;
};

type VersionApiResponse = {
	status: boolean;
	data: {
		updateAvailable: boolean;
		latestVersion: LatestVersion;
	};
};

let cache: { latest: LatestVersion | null; at: number } = { latest: null, at: 0 };
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getLatestVersion(): Promise<LatestVersion | null> {
	const versionAPI =
		(process.env.GGAP_VERSION_API as string) ??
		'https://chat.golrang.com/download/api/v1/check-version/?package=com.golrang.ggap&variant=win&version=5&deviceId=deviceId8';
	const now = Date.now();
	if (cache.latest && now - cache.at < TTL_MS) return cache.latest;

	try {
		// If you're on Meteor 3+, `fetch` is global. Else use `meteor/fetch`.
		const res = await fetch(versionAPI);
		if (!res.ok) throw new Error(`Version API HTTP ${res.status}`);
		const json = (await res.json()) as VersionApiResponse;
		const latest = json?.data?.latestVersion ?? null;
		cache = { latest, at: now };
		return latest;
	} catch (e) {
		console.error('[versionService] fetch failed:', e);
		return cache.latest; // fall back to stale cache if any
	}
}
