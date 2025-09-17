import { ReactElement, ReactNode, useEffect, useRef, useCallback, useState } from 'react';
import React, { Suspense } from 'react';
import AuthenticationCheck from './AuthenticationCheck';
import Preload from './Preload';
import { useCustomScript } from './useCustomScript';
import IncomingCallBridge from '/client/lib/IncomingCallBridge';
import AddParticipant from '/client/components/modal/AddParticipant';
import DeprecationBannerModal from '/client/components/modal/DeprecationBannerModal';
import { useSetModal } from '@rocket.chat/ui-contexts';
import { VideoConfManager } from '/client/lib/VideoConfManager';
import { clearIncomingCall } from '/client/lib/incomingCallStore';
import { goToRoomById } from '/client/lib/utils/goToRoomById';
import { useVersionCheck } from '../hooks/useVersionCheck';
import { useDesktopVersionGate } from '../hooks/useDesktopVersionGate';

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
	const { data, error } = useVersionCheck();
	const gate = useDesktopVersionGate(data);
	const lastKeyRef = useRef<string>('');
	const handleCloseModal = useCallback(() => {
		setModal(null);
	}, [setModal]);
	const [isWarningVisible, setIsWarningVisible] = useState(true);

	const handleDownload = () => {
		const baseUrl = 'https://chat.golrang.com/download';
		window.open(`${baseUrl}${gate?.download}`, '_blank');
	};

	useEffect(() => {
		// after you’ve set up RocketChatDesktop.on(...) listeners
		window.RocketChatDesktop?.send?.('webapp:ready', { ts: Date.now() });
	}, []);

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
		if (window.RocketChatDesktop && typeof window.RocketChatDesktop.on === 'function') {
			const unsubscribe = window.RocketChatDesktop.on('webapp:hide-serverside-update-modal', () => {
				setIsWarningVisible(false);
			});

			return () => {
				unsubscribe();
			};
		}
	}, []);

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
				action: 'answer' | 'decline' | 'lost' | 'declineAndReply' | 'click' | 'reply' | 'dismiss';
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
					} else if (action === 'decline' || action === 'declineAndReply') {
						if (message && message.type === 'direct') {
							VideoConfManager.rejectIncomingCall(callId);
						} else {
							clearIncomingCall();
							VideoConfManager.declineIncomingCall(sender._id);
						}
						goToRoomById(rid);
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

	useEffect(() => {
		if (!gate) return;

		if (gate.decision === 'ok') {
			handleCloseModal();
			return;
		}

		if (!isWarningVisible) {
			handleCloseModal();
			return;
		}

		// idempotency: only react when the decision meaningfully changes
		if (lastKeyRef.current === gate.key) return;
		lastKeyRef.current = gate.key;

		setModal(
			<DeprecationBannerModal
				isVisible={isWarningVisible}
				onDownload={handleDownload}
				onClose={handleCloseModal}
				isRTL={true}
				isForced={gate.isForced}
			/>,
		);
	}, [gate, setModal, handleCloseModal, isWarningVisible]);

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
