import type { IRoom } from '@rocket.chat/core-typings';
import type { ReactElement, ReactNode } from 'react';
import React, { useState, useMemo, useEffect } from 'react';
import type { Unsubscribe } from 'use-subscription';

import type { VideoConfPopupPayload } from '../contexts/VideoConfContext';
import { VideoConfContext } from '../contexts/VideoConfContext';
import type { DirectCallParams, ProviderCapabilities, CallPreferences } from '../lib/VideoConfManager';
import { VideoConfManager } from '../lib/VideoConfManager';
import VideoConfPopups from '../views/room/contextualBar/VideoConference/VideoConfPopups';
import DraggableModal from '../components/modal/DraggableModal';
import AddParticipant from '../components/modal/AddParticipant';
type WindowMaybeDesktop = typeof window & {
	RocketChatDesktop?: {
		openInternalVideoChatWindow?: (url: string, options: undefined) => void;
	};
};

const moveApiKeyBeforeFragment = (originalUrl: string, apiKey: string) => {
	const url = new URL(originalUrl);

	// Add the API key as a search parameter
	url.searchParams.set('Apikey', apiKey);
	url.searchParams.set('lang', 'fa');

	return url.toString();
};

const getApikey = () => {
	return '7zLsetAP9NFyHBkBdQJscuG';
};

const VideoConfContextProvider = ({ children }: { children: ReactNode }): ReactElement => {
	const [outgoing, setOutgoing] = useState<VideoConfPopupPayload | undefined>();
	const [videoConf, setVideoConf] = useState<{
		show: boolean;
		url: string;
		onConfirm: () => void;
		callId: string;
	} | null>(null);

	useEffect(
		() =>
			VideoConfManager.on('call/join', (props) => {
				const windowMaybeDesktop = window as WindowMaybeDesktop;
				if (windowMaybeDesktop.RocketChatDesktop?.openInternalVideoChatWindow) {
					windowMaybeDesktop.RocketChatDesktop.openInternalVideoChatWindow(props.url, undefined);
				} else {
					const newUrl = moveApiKeyBeforeFragment(props.url, getApikey());
					const open = (): void => {
						setVideoConf({
							show: true,
							url: newUrl,
							onConfirm: open,
							callId: props.callId,
						});
					};
					open();
				}
			}),
		[],
	);

	useEffect(() => {
		VideoConfManager.on('direct/end', () => {
			setVideoConf(null);
		});
		VideoConfManager.on('direct/stopped', (params) => {
			setOutgoing(undefined);
		});
		VideoConfManager.on('calling/ended', () => {
			setOutgoing(undefined);
		});
	}, []);

	const handleVideoConfClose = () => {
		VideoConfManager.leftCall(videoConf?.callId ?? '');

		setVideoConf(null);
	};

	const contextValue = useMemo(
		() => ({
			manager: VideoConfManager,
			dispatchOutgoing: (option: Omit<VideoConfPopupPayload, 'id'>): void => setOutgoing({ ...option, id: option.rid }),
			dismissOutgoing: (): void => setOutgoing(undefined),
			startCall: (rid: IRoom['_id'], confTitle?: string): Promise<void> => VideoConfManager.startCall(rid, confTitle),
			acceptCall: (callId: string): void => VideoConfManager.acceptIncomingCall(callId),
			joinCall: (callId: string): Promise<void> => VideoConfManager.joinCall(callId),
			dismissCall: (callId: string): void => {
				VideoConfManager.dismissIncomingCall(callId);
			},
			rejectIncomingCall: (callId: string): void => VideoConfManager.rejectIncomingCall(callId),
			abortCall: (): void => VideoConfManager.abortCall(),
			setPreferences: (prefs: Partial<typeof VideoConfManager['preferences']>): void => VideoConfManager.setPreferences(prefs),
			queryIncomingCalls: {
				getCurrentValue: (): DirectCallParams[] => VideoConfManager.getIncomingDirectCalls(),
				subscribe: (cb: () => void): Unsubscribe => VideoConfManager.on('incoming/changed', cb),
			},
			queryRinging: {
				getCurrentValue: (): boolean => VideoConfManager.isRinging(),
				subscribe: (cb: () => void): Unsubscribe => VideoConfManager.on('ringing/changed', cb),
			},
			queryCalling: {
				getCurrentValue: (): boolean => VideoConfManager.isCalling(),
				subscribe: (cb: () => void): Unsubscribe => VideoConfManager.on('calling/changed', cb),
			},
			queryCapabilities: {
				getCurrentValue: (): ProviderCapabilities => VideoConfManager.capabilities,
				subscribe: (cb: () => void): Unsubscribe => VideoConfManager.on('capabilities/changed', cb),
			},
			queryPreferences: {
				getCurrentValue: (): CallPreferences => VideoConfManager.preferences,
				subscribe: (cb: () => void): Unsubscribe => VideoConfManager.on('preference/changed', cb),
			},
		}),
		[],
	);

	return (
		<VideoConfContext.Provider value={contextValue}>
			{children}
			<VideoConfPopups>{outgoing}</VideoConfPopups>

			{/* Persistent DraggableModal - only hidden/shown, never destroyed */}
			{videoConf && (
				<DraggableModal
					show={videoConf.show}
					onClose={handleVideoConfClose}
					onConfirm={videoConf.onConfirm}
					url={videoConf.url}
					title='تماس'
					userSelectorComponent={<AddParticipant callId={videoConf.callId} />}
				/>
			)}
		</VideoConfContext.Provider>
	);
};

export default VideoConfContextProvider;
