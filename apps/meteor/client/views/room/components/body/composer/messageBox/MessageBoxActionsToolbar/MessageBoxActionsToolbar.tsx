import type { IRoom, IMessage } from '@rocket.chat/core-typings';
import React, { memo } from 'react';
import { useUserRoom } from '@rocket.chat/ui-contexts';
// import ActionsToolbarDropdown from './ActionsToolbarDropdown';
// import AudioMessageAction from './actions/AudioMessageAction';
// import FileUploadAction from './actions/FileUploadAction';
import ShareLocationAction from './actions/ShareLocationAction';
import VideoMessageAction from './actions/VideoMessageAction';

type MessageBoxActionsToolbarProps = {
	variant: 'small' | 'large';
	isRecording: boolean;
	typing: boolean;
	canSend: boolean;
	rid: IRoom['_id'];
	tmid?: IMessage['_id'];
	isMicrophoneDenied?: boolean;
};

const MessageBoxActionsToolbar = ({
	variant = 'large',
	isRecording,
	typing,
	canSend,
	rid,
	tmid,
	isMicrophoneDenied,
}: MessageBoxActionsToolbarProps) => {
	const room = useUserRoom(rid);
	const actions = [
		
		<VideoMessageAction key='video' collapsed={variant === 'small'} disabled={!canSend || typing || isRecording} />,
		// <AudioMessageAction
		// 	key='audio'
		// 	disabled={!canSend || typing || isRecording || isMicrophoneDenied}
		// 	isMicrophoneDenied={isMicrophoneDenied}
		// />,
		// <FileUploadAction key='file' collapsed={variant === 'small'} disabled={!canSend || isRecording} />,
	];

	let featuredAction;
	if (variant === 'small') {
		featuredAction = actions.splice(1, 1);
	}

	return (
		<>
			{/* {variant !== 'small' && actions}
			{variant === 'small' && featuredAction} */}
			{/* <ActionsToolbarDropdown {...(variant === 'small' && { actions })} isRecording={isRecording} rid={rid} tmid={tmid} />
			 */}
			{room && <ShareLocationAction room={room} tmid={tmid} />}
		</>
	);
};

export default memo(MessageBoxActionsToolbar);
