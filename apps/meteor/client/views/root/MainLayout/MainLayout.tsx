import { ReactElement, ReactNode, useEffect, useCallback } from 'react';
import React, { Suspense } from 'react';

import AuthenticationCheck from './AuthenticationCheck';
import Preload from './Preload';
import { useCustomScript } from './useCustomScript';
import IncomingCallBridge from '/client/lib/IncomingCallBridge';
import AddParticipant from '/client/components/modal/AddParticipant';
import { useSetModal } from '@rocket.chat/ui-contexts';
import { VideoConfManager } from '/client/lib/VideoConfManager';
import { clearIncomingCall } from '/client/lib/incomingCallStore';
import { goToRoomById } from '/client/lib/utils/goToRoomById';

type MainLayoutProps = {
	children?: ReactNode;
} & Record<string, unknown>;

type Payload = {
	_id?: string;
	rid: string;
	callId: string;
	sender: {
		_id: string;
		username: string;
		name: string;
	};
	type?: string;
	message?: {
		msg?: string;
		type?: string;
		t?: string;
	};
};

const MainLayout = ({ children = null }: MainLayoutProps): ReactElement => {
	useCustomScript();
	const setModal = useSetModal();

	const handleCloseModal = useCallback(() => {
		if (window.RocketChatDesktop?.send) {
			window.RocketChatDesktop.send('video-call-focus-requested');
		}
		setModal(null);
	}, [setModal]);

	useEffect(() => {
		if (window.RocketChatDesktop && typeof window.RocketChatDesktop.on === 'function') {
			const unsubscribe = window.RocketChatDesktop.on('webapp:show-add-participants-modal', ({ callId }: { callId: string }) => {
				setModal(<AddParticipant callId={callId} onClose={handleCloseModal} />);
			});

			return () => {
				unsubscribe();
			};
		}
	}, [setModal, handleCloseModal]);

	useEffect(() => {
		if (!window.RocketChatDesktop || typeof window.RocketChatDesktop.on !== 'function') {
			return;
		}
		// 1) from Electron: answer/decline/dismiss + original payload
		const offAction = window.RocketChatDesktop.on(
			'webapp:notification-action',
			({
				action,
				kind,
				payload,
				title,
				body,
			}: {
				action: 'answer' | 'decline' | 'lost' | 'click' | 'reply' | 'dismiss';
				kind: 'call' | 'message';
				payload: Payload;
				title?: string;
				body?: string;
			}) => {
				if (kind === 'call') {
					const { rid, callId, message, sender } = payload || {};
					if (action === 'answer') {
						VideoConfManager.joinCall(callId);
						if (!message || message?.type === 'videoconference') {
							clearIncomingCall();
						}
						goToRoomById(rid);
					} else if (action === 'decline') {
						if (message && message.type === 'direct') {
							VideoConfManager.rejectIncomingCall(callId);
						} else {
							clearIncomingCall();
							VideoConfManager.declineIncomingCall(sender._id);
						}
					} else if (action === 'lost') {
						if (!message || message?.type === 'videoconference') {
							clearIncomingCall();
							VideoConfManager.lostIncomingCall(sender._id);
						}
					}
				} else {
					const { rid } = payload || {};
					if (action === 'click' || action === 'reply') {
						goToRoomById(rid);
					} else if (action === 'dismiss') {
					}
				}
			},
		);

		return () => {
			offAction && offAction();
		};
	}, []);

	return (
		<>
			<Preload>
				<AuthenticationCheck>
					<Suspense fallback={null}>{children}</Suspense>
				</AuthenticationCheck>
			</Preload>
			<IncomingCallBridge />
		</>
	);
};

export default MainLayout;
