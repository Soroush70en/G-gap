import type { ReactElement, ReactNode } from 'react';
import React, { Suspense } from 'react';

import AuthenticationCheck from './AuthenticationCheck';
import Preload from './Preload';
import { useCustomScript } from './useCustomScript';
import IncomingCallBridge from '/client/lib/IncomingCallBridge';

type MainLayoutProps = {
	children?: ReactNode;
} & Record<string, unknown>;

const MainLayout = ({ children = null }: MainLayoutProps): ReactElement => {
	useCustomScript();
	
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
