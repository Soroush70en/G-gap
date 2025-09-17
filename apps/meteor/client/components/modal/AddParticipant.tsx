import type { IUser } from '@rocket.chat/core-typings';
import { Box, Modal, Button } from '@rocket.chat/fuselage';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';
import { useTranslation } from '@rocket.chat/ui-contexts';
import type { FC } from 'react';
import React, { useState, memo } from 'react';

import UserAutoCompleteMultipleFederated from '../UserAutoCompleteMultiple/UserAutoCompleteMultipleFederated';
import { useEndpointAction } from '../../hooks/useEndpointAction';

type Username = Exclude<IUser['username'], undefined>;

type CreateDirectMessageProps = {
	onClose: () => void;
	callId: string;
};

const AddParticipant: FC<CreateDirectMessageProps> = ({ onClose, callId }) => {
	const t = useTranslation();
	const [users, setUsers] = useState<Array<Username>>([]);
	const currentUserId = Meteor.userId();

	const addToCall = useEndpointAction('POST', '/v1/video-conference.add');

	const onCreate = useMutableCallback(async () => {
		try {
			await addToCall({ callId, currentUserId, usernames: users });
			onClose();
		} catch (error) {
			console.warn(error);
		}
	});

	return (
		<Modal data-qa='create-direct-modal'>
			<Modal.Header>
				<Modal.Title>{t('Add_Participants')}</Modal.Title>
				<Modal.Close onClick={onClose} />
			</Modal.Header>
			<Modal.Content mbe='x2'>
				<Box>{t('Add_Participants_description')}</Box>
				<Box mbs='x16' display='flex' flexDirection='column' width='full'>
					<UserAutoCompleteMultipleFederated value={users} onChange={setUsers} />
				</Box>
			</Modal.Content>
			<Modal.Footer>
				<Modal.FooterControllers>
					<Button onClick={onClose}>{t('Cancel')}</Button>
					<Button disabled={users.length < 1} onClick={onCreate} primary>
						{t('Add')}
					</Button>
				</Modal.FooterControllers>
			</Modal.Footer>
		</Modal>
	);
};

export default memo(AddParticipant);
