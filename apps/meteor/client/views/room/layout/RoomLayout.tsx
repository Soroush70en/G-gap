import { Box } from '@rocket.chat/fuselage';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import React, { useRef, useEffect, useCallback } from 'react';

import VerticalBar from '../../../components/VerticalBar/VerticalBar';

import { useVersionCheck } from '../../root/hooks/useVersionCheck';
import { useDesktopVersionGate } from '../../root/hooks/useDesktopVersionGate';
import DeprecationBannerModal from '/client/components/modal/DeprecationBannerModal';
import { useSetModal } from '@rocket.chat/ui-contexts';

type RoomLayoutProps = {
	header?: ReactNode;
	body?: ReactNode;
	footer?: ReactNode;
	aside?: ReactNode;
} & ComponentProps<typeof Box>;

const RoomLayout = ({ header, body, footer, aside, ...props }: RoomLayoutProps): ReactElement => {
	const setModal = useSetModal();
	const { data, error } = useVersionCheck();
	const gate = useDesktopVersionGate(data);
	const lastKeyRef = useRef<string>('');
	const handleCloseModal = useCallback(() => {
		setModal(null);
	}, [setModal]);

	const handleDownload = () => {
		const baseUrl = 'https://chat.golrang.com/download';
		window.open(`${baseUrl}${gate?.download}`, '_blank');
		handleCloseModal();
	};

	useEffect(() => {
		if (!gate) return;

		if (gate.decision === 'ok' || gate.decision === 'warn') {
			handleCloseModal();
			return;
		}

		// idempotency: only react when the decision meaningfully changes
		if (lastKeyRef.current === gate.key) return;
		lastKeyRef.current = gate.key;

		setModal(
			<DeprecationBannerModal
				isVisible={true}
				onDownload={handleDownload}
				onClose={handleCloseModal}
				isRTL={true}
				isForced={gate.isForced}
			/>,
		);
	}, [gate, setModal, handleCloseModal]);

	return (
		<Box is='main' h='full' display='flex' flexDirection='column' bg='room' {...props}>
			{header}
			<Box display='flex' flexGrow={1} overflow='hidden' height='full' position='relative'>
				<Box display='flex' flexDirection='column' flexGrow={1}>
					<Box is='div' display='flex' flexDirection='column' flexGrow={1}>
						{body}
					</Box>
					{footer && <Box is='footer'>{footer}</Box>}
				</Box>
				{aside && <VerticalBar is='aside'>{aside}</VerticalBar>}
			</Box>
		</Box>
	);
};

export default RoomLayout;
