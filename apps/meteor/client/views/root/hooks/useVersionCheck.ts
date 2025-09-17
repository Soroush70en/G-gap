import { useEndpoint } from '@rocket.chat/ui-contexts';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

export type VersionCheckResponse = {
	status: string;
	data: {
		platform: 'electron' | 'web';
		current: string;
		latest: string;
		forceUpdate: boolean;
		decision: 'ok' | 'warn' | 'force';
		download?: string; // Download URL for the app (if applicable)
	};
};

export const useVersionCheck = (): UseQueryResult<VersionCheckResponse, Error> => {
	const getVersionCheck = useEndpoint('GET', '/v1/desktop.version-check');

	return useQuery(
		['desktopVersionCheck'],
		async () => {
			const response = await getVersionCheck();
			return response as VersionCheckResponse;
		},
		{
			staleTime: 60 * 60 * 1000, // Cache for 60 minute
			retry: 3, // Retry 3 times if request fails
			onError: (error) => {
				console.error('Error fetching version data:', error);
			},
		},
	);
};
