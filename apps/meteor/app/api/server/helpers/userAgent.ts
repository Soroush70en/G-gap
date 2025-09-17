// app/api/server/helpers/ua.ts
import semver from 'semver';

// Define the structure for the client info
export type ClientInfo = {
	isElectron: boolean; // Whether the client is an Electron app
	appVersion: string | null; // The version of the app (e.g., "1.0.7")
	electronVersion: string | null; // The version of Electron (e.g., "22.3.27")
	raw: string; // The raw user-agent string
};

// Function to parse the user-agent string
export function parseUserAgent(uaRaw: string | undefined): ClientInfo {
	const ua = uaRaw ?? '';
	const isElectron = /\bElectron\/\d/.test(ua) || /\bG-?Gap\/\d/.test(ua); // Detect Electron

	// Extract app version (e.g., "1.0.7")
	const appVersion = ua.match(/\bG-?Gap\/([\d.]+)/)?.[1] ?? null;

	// Extract Electron version (e.g., "22.3.27")
	const electronVersion = ua.match(/\bElectron\/([\d.]+)/)?.[1] ?? null;

	return { isElectron, appVersion, electronVersion, raw: ua };
}

// Function to check if the current version is outdated based on semver
export function isOutdated(current: string | null, latest: string): boolean {
	if (!current) return false; // If no current version, don't consider it outdated
	return semver.lt(semver.coerce(current)!, semver.coerce(latest)!);
}

// Function to compare current version with required minimum version
export function needsUpgrade(current: string | null, required: string): boolean {
	if (!current) return true; // If no current version, force upgrade
	return semver.lt(semver.coerce(current)!, semver.coerce(required)!);
}
