// مسیر: client/components/message/reactions/Reactions.tsx

import type { IMessage } from '@rocket.chat/core-typings';
import React from 'react';
import type { ReactElement } from 'react';
import {
  MessageReactions,
  MessageReactionAction,
  Avatar,
  Box,
  Margins,
} from '@rocket.chat/fuselage';
import Emoji from '../../Emoji';
import {
  useOpenEmojiPicker,
  useReactionsFilter,
  useUserHasReacted,
} from '../list/MessageListContext';
import { useToggleReactionMutation } from './reactions/useToggleReactionMutation';

type ReactionsProps = {
  message: IMessage;
};

const Reactions = ({ message }: ReactionsProps): ReactElement => {
  const hasReacted = useUserHasReacted(message);
  const filterReactions = useReactionsFilter(message);
  const openEmojiPicker = useOpenEmojiPicker(message);
  const toggleReaction = useToggleReactionMutation();

  return (
    <MessageReactions>
      {message.reactions &&
        Object.entries(message.reactions).map(([name, { usernames }]) => (
          <Box
            key={name}
            display='flex'
            alignItems='center'
            mi='x4'
            style={{ cursor: 'pointer' }}
            onClick={() =>
              toggleReaction.mutate({ mid: message._id, reaction: name })
            }
          >
            {/* ایموجی: title لیست یوزرنیم‌هاست */}
            <Box
              is='span'
              fontScale='p2'
              mi='x2'
              title={usernames.join(', ')}
            >
              <Emoji emojiHandle={name} />
            </Box>

            {/* لیست آواتارها */}
            <Margins inline='x2'>
              {usernames.slice(0, 5).map((username) => (
                <Avatar
                  key={username}
                  url={`/avatar/${encodeURIComponent(
                    username,
                  )}?format=png&size=20`}
                  title={username}
                  size='x20'
                />
              ))}
              {usernames.length > 5 && (
                <Box fontScale='c1' color='hint' alignSelf='center'>
                  +{usernames.length - 5}
                </Box>
              )}
            </Margins>
          </Box>
        ))}
      <MessageReactionAction onClick={openEmojiPicker} />
    </MessageReactions>
  );
};

export default Reactions;