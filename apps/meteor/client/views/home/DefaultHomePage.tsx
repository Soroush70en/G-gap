import { Box, Grid } from '@rocket.chat/fuselage';
import { useAtLeastOnePermission, useSetting, useTranslation, useRole, usePermission } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React, { useRef, useEffect, useCallback } from 'react';

import Page from '../../components/Page/Page';
import PageScrollableContent from '../../components/Page/PageScrollableContent';
import HomePageHeader from './HomePageHeader';
import HomepageGridItem from './HomepageGridItem';
import AddUsersCard from './cards/AddUsersCard';
import CreateChannelsCard from './cards/CreateChannelsCard';
import CustomContentCard from './cards/CustomContentCard';
import { useVersionCheck } from '../root/hooks/useVersionCheck';
import { useDesktopVersionGate } from '../root/hooks/useDesktopVersionGate';
import DeprecationBannerModal from '/client/components/modal/DeprecationBannerModal';
import { useSetModal } from '@rocket.chat/ui-contexts';

const CREATE_CHANNEL_PERMISSIONS = ['create-c', 'create-p'];

const DefaultHomePage = (): ReactElement => {
	const t = useTranslation();
	const canAddUsers = usePermission('view-user-administration');
	const isAdmin = useRole('admin');
	const canCreateChannel = useAtLeastOnePermission(CREATE_CHANNEL_PERMISSIONS);
	const workspaceName = useSetting('Site_Name');
	const isCustomContentBodyEmpty = useSetting('Layout_Home_Body') === '';
	const isCustomContentVisible = Boolean(useSetting('Layout_Home_Custom_Block_Visible'));

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

		if (gate.decision === 'ok') {
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
		<Page color='default' is='main' data-qa='page-home' data-qa-type='default' background='tint'>
			<HomePageHeader />
			<PageScrollableContent>
				<Box is='h2' fontScale='h1' mb='x20' role='heading' data-qa-id='homepage-welcome-text'>
					{t('Welcome_to', { Site_Name: workspaceName || 'G-Gap' })}
				</Box>
				{/* <Box is='h3' fontScale='h3' mb='x16'>
					{t('Some_ideas_to_get_you_started')}
				</Box> */}
				<Grid margin='neg-x8'>
					{canAddUsers && (
						<HomepageGridItem>
							<AddUsersCard />
						</HomepageGridItem>
					)}
					{canCreateChannel && (
						<HomepageGridItem>
							<CreateChannelsCard />
						</HomepageGridItem>
					)}
					{/* <HomepageGridItem>
						<JoinRoomsCard />
					</HomepageGridItem>
					<HomepageGridItem>
						<MobileAppsCard />
					</HomepageGridItem>
					<HomepageGridItem>
						<DesktopAppsCard />
					</HomepageGridItem>
					<HomepageGridItem>
						<DocumentationCard />
					</HomepageGridItem> */}
				</Grid>
				{(isAdmin || (isCustomContentVisible && !isCustomContentBodyEmpty)) && (
					<Box pbs='x16' mbe='x32'>
						<CustomContentCard />
					</Box>
				)}
			</PageScrollableContent>
		</Page>
	);
};

export default DefaultHomePage;
