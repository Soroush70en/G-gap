// apps/meteor/client/views/home/HomePage.tsx
import React, { FC } from 'react';
import type { ReactElement } from 'react';
import { Button, Box, Modal, Option, OptionIcon, OptionContent } from '@rocket.chat/fuselage';
import { useSetting, useSetModal, useTranslation } from '@rocket.chat/ui-contexts';

import CustomHomePage from './CustomHomePage';
import DefaultHomePage from './DefaultHomePage';

// اگر مسیرها فرق دارد نسبت به HomePage اصلاحشان کنید
import CreateChannelModal from '../../sidebar/header/CreateChannel/CreateChannelModal';
import CreateTeamModal from '../../sidebar/header/CreateTeam/CreateTeamModal';
import CreateDirectMessage from '../../sidebar/header/CreateDirectMessage';

// ---------- Modal انتخاب نوع گفتگو ----------
const StartChatModal: FC<{ onClose: () => void }> = ({ onClose }) => {
  const setModal = useSetModal();
  const t = useTranslation();

  const openCreateChannel = () => setModal(<CreateChannelModal onClose={() => setModal(null)} />);
  const openCreateTeam = () => setModal(<CreateTeamModal onClose={() => setModal(null)} />);
  const openCreateDM = () => setModal(<CreateDirectMessage onClose={() => setModal(null)} />);

  return (
    <Modal>
      <Modal.Header>
        <Modal.Title>{t('start_chat_modal_title')}</Modal.Title>
        <Modal.Close onClick={onClose} />
      </Modal.Header>

      <Modal.Content>
        <Box is="ul" m={0} p={0} style={{ listStyle: 'none' }}>
        <Option onClick={openCreateDM}>
            <OptionIcon name="balloon" />
            <OptionContent>{t('start_chat_modal_direct_messages')}</OptionContent>
          </Option>

         <Option onClick={openCreateTeam}>
            <OptionIcon name="list" />
            <OptionContent>{t('start_chat_modal_team')}</OptionContent>
          </Option>

          <Option onClick={openCreateChannel}>
            <OptionIcon name="hash" />
            <OptionContent>{t('start_chat_modal_channel')}</OptionContent>
          </Option>
         
        </Box>
      </Modal.Content>
    </Modal>
  );
};

// ---------- دکمه روی صفحه ----------
const StartChat = () => {
  const setModal = useSetModal();
  const t = useTranslation();

  const openStartChatModal = () => setModal(<StartChatModal onClose={() => setModal(null)} />);

  return (
    <div className="start-chat-container">
      {/* <Box fontScale="h2" style={{ marginBottom: '10px' }}>
        {t('start_chat_heading')}
      </Box> */}
      <Button primary size="lg" className="start-chat-button" onClick={openStartChatModal}>
        {t('start_chat_cta')}
      </Button>
    </div>
  );
};

const HomePage = (): ReactElement => {
  const customOnly = useSetting('Layout_Custom_Body_Only');

  return customOnly ? (
    <>
      <CustomHomePage />
      <StartChat />
    </>
  ) : (
    <>
      <DefaultHomePage />
      <StartChat />
    </>
  );
};

export default HomePage;
