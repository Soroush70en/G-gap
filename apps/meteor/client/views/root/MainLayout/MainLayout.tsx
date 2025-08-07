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
		setModal(null); // Setting the modal to null will close it.
	}, [setModal]);

	useEffect(() => {
		// Check for the API and the new 'on' method
		if (window.RocketChatDesktop && typeof window.RocketChatDesktop.on === 'function') {
			alert('Here');
			window.RocketChatDesktop.on('video-call-window/open-url', () => alert('video-call-window/open-url'));
			// Use your official API to subscribe to the event
			const unsubscribe = window.RocketChatDesktop.on('webapp:show-add-participants-modal', ({ callId }: { callId: string }) => {
				// 3. Instead of using local state, pass the entire component
				//    you want to render to the setModal function.
				setModal(<AddParticipant callId={callId} onClose={handleCloseModal} />);
			});

			// The useEffect cleanup function will now call the returned unsubscribe function
			return () => {
				unsubscribe();
			};
		}
	}, [setModal, handleCloseModal]); // Empty dependency array ensures this runs only once on mount

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
