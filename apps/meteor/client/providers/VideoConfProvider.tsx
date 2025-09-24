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
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';

type WindowMaybeDesktop = typeof window & {
	RocketChatDesktop?: {
		openInternalVideoChatWindow?: (url: string, options: undefined) => void;
	};
};

const VideoConfContextProvider = ({ children }: { children: ReactNode }): ReactElement => {
	const [outgoing, setOutgoing] = useState<VideoConfPopupPayload | undefined>();
	const [videoConf, setVideoConf] = useState<{
		show: boolean;
		url: string;
		onConfirm: () => void;
		callId: string;
	} | null>(null);
	const setStatus = useEndpoint('POST', '/v1/users.setStatus');
	const currentUserId = Meteor.userId();
	useEffect(
		() =>
			VideoConfManager.on('call/join', ({ callId, url, type }) => {
				console.log({ callId, url, type });
				const open = async (): void => {
					const payload = { status: 'busy', message: type === 'direct' ? 'در تماس هستم' : 'در جلسه هستم', userId: currentUserId };
					await setStatus(payload);
					setVideoConf({
						show: true,
						url: url,
						onConfirm: open,
						callId: callId,
					});
				};
				open();
			}),
		[],
	);

	useEffect(() => {
		VideoConfManager.on('direct/end', () => {
			const payload = { status: 'online', message: '', userId: currentUserId };
			setStatus(payload);
			setVideoConf(null);
		});
		VideoConfManager.on('direct/stopped', (params) => {
			setOutgoing(undefined);
		});
		VideoConfManager.on('direct/lost', ({ callId, rid, uid }) => {
			if (window.RocketChatDesktop && typeof window.RocketChatDesktop.on === 'function') {
				window.RocketChatDesktop?.send('electron:call-cancelled', { callId });
			}
		});
		VideoConfManager.on('calling/ended', () => {
			setOutgoing(undefined);
		});
	}, []);

	const handleVideoConfClose = () => {
		VideoConfManager.leftCall(videoConf?.callId ?? '');
		const payload = { status: 'online', message: '', userId: currentUserId };
		setStatus(payload);
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
