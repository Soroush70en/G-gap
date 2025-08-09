import { ReactElement, ReactNode, useEffect, useCallback } from 'react';
import React, { Suspense } from 'react';

import AuthenticationCheck from './AuthenticationCheck';
import Preload from './Preload';
import { useCustomScript } from './useCustomScript';
import IncomingCallBridge from '/client/lib/IncomingCallBridge';
import AddParticipant from '/client/components/modal/AddParticipant';
import { useSetModal } from '@rocket.chat/ui-contexts';

type MainLayoutProps = {
	children?: ReactNode;
} & Record<string, unknown>;

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
