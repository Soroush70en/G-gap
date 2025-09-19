import { useMemo } from 'react';
import lt from 'semver/functions/lt';
import coerce from 'semver/functions/coerce';
import { VersionCheckResponse } from './useVersionCheck';

type Res = VersionCheckResponse['data'];

export type DesktopVersionGate = {
	isElectron: boolean;
	decision: Res['decision'];
	current: string | null | undefined;
	normalizedCurrent: string | null; // semver-coerced
	latest: string | null | undefined;
	download: string | null | undefined;
	isForced: boolean; // <- replaces uiLevel
	key: string; // useful to avoid reopening same UI repeatedly
	forceUpdate: boolean;
};

type Options = {
	// Fixed (blocking) threshold
	fixedBefore?: string; // default '1.0.5'
};

export function useDesktopVersionGate(data?: VersionCheckResponse, opts: Options = { fixedBefore: '1.0.5' }): DesktopVersionGate | null {
	return useMemo(() => {
		if (!data) return null;

		const res: Res = data.data;
		const isElectron = res.platform === 'electron';
		const normalizedCurrent = coerce(res.current ?? '')?.version ?? null;

		// "Forced" when server says force OR version is older than fixed threshold
		const isForced =
			isElectron &&
			(res.decision === 'force' || (normalizedCurrent != null && !!opts.fixedBefore && lt(normalizedCurrent, opts.fixedBefore)));

		const key = `${res.platform}:${isForced ? 'forced' : 'soft'}:${normalizedCurrent ?? '0.0.0'}`;

		return {
			isElectron,
			decision: res.decision,
			current: res.current,
			normalizedCurrent,
			latest: res.latest,
			download: res.download,
			isForced: isForced,
			key,
			forceUpdate: res.forceUpdate,
		};
	}, [data, opts.fixedBefore]);
}
