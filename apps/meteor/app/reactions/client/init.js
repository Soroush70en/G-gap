// client/startup/init.js

import { Meteor } from 'meteor/meteor';
import { MessageAction } from '../../ui-utils';
import { messageArgs } from '../../../client/lib/utils/messageArgs';
import { EmojiPicker } from '../../emoji';
import { roomCoordinator } from '../../../client/lib/rooms/roomCoordinator';
import { callbacks } from '../../../lib/callbacks';


Meteor.startup(() => {
  // —————————— 1) یک-ری‌اکشن برای هر کاربر ——————————
  MessageAction.addButton({
    id: 'reaction-message',
    icon: 'add-reaction',
    label: 'Add_Reaction',
    context: ['message', 'message-mobile', 'threads', 'federated'],
    action(event, props) {
      event.stopPropagation();
      const { message = messageArgs(this).msg } = props;
      const user = Meteor.user();
      if (!user) {
        return;
      }
      const username = user.username;
      const reactions = message.reactions || {};

      EmojiPicker.open(event.currentTarget, (emoji) => {
        const newEmoji = `:${ emoji }:`; 

        // پیدا کردن و حذف ری‌اکشن قبلی
        const existing = Object.keys(reactions).find((name) =>
          reactions[name].usernames.includes(username),
        );
        if (existing && existing !== newEmoji) {
          Meteor.call('setReaction', existing, message._id, (err) => {
            if (err) {
              console.error('خطا در حذف ری‌اکشن قبلی:', err);
              return;
            }
            Meteor.call('setReaction', newEmoji, message._id);
          });
        } else {
          Meteor.call('setReaction', newEmoji, message._id);
        }
      });
    },
    condition({ message, user, room, subscription }) {
      if (!room || !subscription || message.private) {
        return false;
      }
      if (roomCoordinator.readOnly(room._id, user) && !room.reactWhenReadOnly) {
        return false;
      }
      if (roomCoordinator.isLivechatRoom(room.t)) {
        return false;
      }
      return true;
    },
    order: -2,
    group: ['message', 'menu'],
  });

  // —————— 2) تغییر UI واکنش‌ها: حذف count و افزودن آواتار ——————
  callbacks.add(
    'renderMessage',
    (message, html) => {
      if (!message.reactions) {
        return html;
      }

      // حذف spanهای عددی
      html = html.replace(
        /<span[^>]*class="rcx-message-reactions__counter"[^>]*>\d+<\/span>/g,
        ''
      );

      // کنار هر ایموجی، لیست آواتارها را inject کن
      Object.entries(message.reactions).forEach(([emoji, data]) => {
        const avatars = data.usernames
          .map(
            (u) =>
              `<img class="rcx-reaction-avatar" title="${u}"
                src="/avatar/${encodeURIComponent(u)}?size=20">`
          )
          .join('');

        const pattern = new RegExp(
          `(<button[^>]*data-emoji="${emoji}"[^>]*>)([\\s\\S]*?)(</button>)`,
          'g'
        );
        html = html.replace(pattern, (_m, p1, _p2, p3) => `${p1}${avatars}${p3}`);
      });

      return html;
    },
    callbacks.priority.HIGH,
    'custom-reaction-avatars'
  );

  // —————— 3) تزریق CSS آواتارها ——————
  const style = document.createElement('style');
  style.textContent = `
    .rcx-reaction-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      margin: 0 2px;
      vertical-align: middle;
    }
  `;
  document.head.appendChild(style);
});
