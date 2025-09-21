import { Box } from '@rocket.chat/fuselage';
import { useUserRoom, useUserAvatarPath } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React, { useCallback, Fragment } from 'react';

import { UserAction } from '../../../../../../../app/ui/client/lib/UserAction';
import { useReactiveValue } from '../../../../../../hooks/useReactiveValue';

const S: Record<string, React.CSSProperties> = {
  disable: { display: 'none' },
  enable: { display: 'block', margin: 0, padding: 0 },
  messageBody: { margin: 0, padding: 0, lineHeight: 0, minHeight: 0 },
  dir: { direction: 'ltr' },
  avatar: { width: 20, height: 20, borderRadius: '50%' },
};

const ComposerUserActionIndicator = ({ rid, tmid }: { rid: string; tmid?: string }): ReactElement => {
  const room = useUserRoom(rid);
  const roomType = room?.t; // "d" | "p" | "c"
  const getUserAvatarPath = useUserAvatarPath();

  const actions = useReactiveValue(
    useCallback(() => {
      const roomAction = UserAction.get(tmid || rid) || {};
      const activities = Object.entries(roomAction);

      return activities
        .map(([key, _users]) => {
          const action = key.split('-')[1] as 'typing' | 'recording' | 'uploading' | 'playing';
          const users = Object.keys(_users || {});
          if (!users.length) return;
          return { action, users };
        })
        .filter(Boolean) as { action: 'typing' | 'recording' | 'uploading' | 'playing'; users: string[] }[];
    }, [rid, tmid]),
  );

  const isTyping = actions.some((a) => a.action === 'typing');

  if (!isTyping) {
    return <Box style={S.disable} />;
  }

  return isTyping ? (
	<Box className='ggap-typing-wrap' role='status' aria-live='polite' data-own='false'>
	  <Box className='ggap-typing-bubble'>
		{/* دمِ چپ — داخل خود باکس حباب */}
		<svg
		  className='ggap-typing-tail'
		  viewBox='0 0 14 18'
		  width={14}
		  height={18}
		  preserveAspectRatio='xMidYMid meet'
		  aria-hidden='true'
		>
		  <path d='M6.5 4L6.5 0H14V14C10.3406 17.2528 3.37479 17.8604 0.900006 17.9739C0.592914 17.988 0.435355 17.6021 0.652113 17.3841C2.2998 15.727 6.5 10.8328 6.5 4Z' />
		</svg>
  
		{/* گروه/کانال → آواتارها */}
		{roomType !== 'd' && (
		  <span className='ggap-typing-avatars'>
			{actions.map(({ users }) => (
			  <Fragment key={users.join(',')}>
				{users.map((username) => {
				  const avatarUrl = getUserAvatarPath(username);
				  return <img key={username} src={avatarUrl} alt={username} style={{ width: 20, height: 20, borderRadius: '50%' }} />;
				})}
			  </Fragment>
			))}
		  </span>
		)}
  
		{/* سه نقطه */}
		<span className='ggap-typing-dots'><i></i><i></i><i></i></span>
	  </Box>
	</Box>
  ) : <Box style={{ display: 'none' }} />;
  
};

export default ComposerUserActionIndicator;
