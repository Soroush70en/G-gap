import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/rocketchat:tap-i18n';
import _ from 'underscore';
import { EmojiCustom } from '@rocket.chat/models';
import { api } from '@rocket.chat/core-services';

import { Messages, Rooms } from '../../models/server';
import { callbacks } from '../../../lib/callbacks';
import { emoji } from '../../emoji/server';
import { isTheLastMessage } from '../../lib/server';
import { canAccessRoom, hasPermission } from '../../authorization/server';
import { AppEvents, Apps } from '../../../ee/server/apps/orchestrator';

const removeUserReaction = (message, reaction, username) => {
	message.reactions[reaction].usernames.splice(message.reactions[reaction].usernames.indexOf(username), 1);
	if (message.reactions[reaction].usernames.length === 0) {
		delete message.reactions[reaction];
	}
	return message;
};

async function setReaction(room, user, message, reaction, shouldReact) {
	// --- normalize emoji name
	reaction = `:${ reaction.replace(/:/g, '') }:`;
  
	// --- validation (همان منطق قبلی شما)
	if (!emoji.list[reaction] && (await EmojiCustom.findByNameOrAlias(reaction).count()) === 0) {
	  throw new Meteor.Error('error-not-allowed', 'Invalid emoji provided.', {
		method: 'setReaction',
	  });
	}
	if (room.ro === true && !room.reactWhenReadOnly && !hasPermission(user._id, 'post-readonly', room._id)) {
	  if (!(room.unmuted || []).includes(user.username)) {
		throw new Error("You can't send messages because the room is readonly.");
	  }
	}
	if (Array.isArray(room.muted) && room.muted.indexOf(user.username) !== -1) {
	  throw new Meteor.Error('error-not-allowed', TAPi18n.__('You_have_been_muted', {}, user.language), {
		rid: room._id,
	  });
	}
  
	// --- پیدا کردن همه‌ی واکنش‌های قبلیِ این کاربر (به جز واکنش فعلی)
	const previousReactions = message.reactions
	  ? Object.keys(message.reactions)
		  .filter((name) => message.reactions[name].usernames.includes(user.username))
		  .filter((name) => name !== reaction)
	  : [];
  
	// --- اگر shouldReact مشخص نیست، بر اساس وضعیت فعلی toggle کن
	const userHasThisReaction =
	  Boolean(message.reactions) &&
	  Boolean(message.reactions[reaction]) &&
	  message.reactions[reaction].usernames.includes(user.username);
  
	if (shouldReact === undefined) {
	  shouldReact = !userHasThisReaction;
	}
  
	// --- اگر می‌خوایم واکنش جدید بزنیم، اول همه‌ی قبلی‌ها رو پاک کن
	if (shouldReact) {
	  for (const prev of previousReactions) {
		const oldMessage = JSON.parse(JSON.stringify(message));
		// حذفِ کاربر از واکنشِ قبلی
		removeUserReaction(message, prev, user.username);
  
		// به‌روزرسانی DB بر اساس اینکه بعد از حذف، هنوز واکنش هست یا نه
		if (_.isEmpty(message.reactions)) {
		  delete message.reactions;
		  if (isTheLastMessage(room, message)) {
			Rooms.unsetReactionsInLastMessage(room._id);
		  }
		  Messages.unsetReactions(message._id);
		} else {
		  Messages.setReactions(message._id, message.reactions);
		  if (isTheLastMessage(room, message)) {
			Rooms.setReactionsInLastMessage(room._id, message);
		  }
		}
  
		// فراخوانی callbackهای مربوط به unset
		callbacks.run('unsetReaction', message._id, prev);
		callbacks.run('afterUnsetReaction', message, {
		  user,
		  reaction: prev,
		  shouldReact: false,
		  oldMessage,
		});
	  }
	}
  
	// --- بررسی وضعیت فعلی واکنشِ انتخابی
	const userAlreadyReacted =
	  Boolean(message.reactions) &&
	  Boolean(message.reactions[reaction]) &&
	  message.reactions[reaction].usernames.indexOf(user.username) !== -1;
  
	// اگر وضعیت جدید با وضعیت فعلی برابر است، هیچ کاری لازم نیست
	if (userAlreadyReacted === shouldReact) {
	  return;
	}
  
	// --- اگر کاربر قبلاً این ایموجی را زده بود، حذفش کن
	let isReacted;
	if (userAlreadyReacted) {
	  const oldMessage = JSON.parse(JSON.stringify(message));
	  removeUserReaction(message, reaction, user.username);
	  if (_.isEmpty(message.reactions)) {
		delete message.reactions;
		if (isTheLastMessage(room, message)) {
		  Rooms.unsetReactionsInLastMessage(room._id);
		}
		Messages.unsetReactions(message._id);
	  } else {
		Messages.setReactions(message._id, message.reactions);
		if (isTheLastMessage(room, message)) {
		  Rooms.setReactionsInLastMessage(room._id, message);
		}
	  }
	  callbacks.run('unsetReaction', message._id, reaction);
	  callbacks.run('afterUnsetReaction', message, {
		user,
		reaction,
		shouldReact,
		oldMessage,
	  });
	  isReacted = false;
	} else {
	  // --- در غیر این صورت، واکنش جدید را اضافه کن
	  if (!message.reactions) {
		message.reactions = {};
	  }
	  if (!message.reactions[reaction]) {
		message.reactions[reaction] = { usernames: [] };
	  }
	  message.reactions[reaction].usernames.push(user.username);
	  Messages.setReactions(message._id, message.reactions);
	  if (isTheLastMessage(room, message)) {
		Rooms.setReactionsInLastMessage(room._id, message);
	  }
	  callbacks.run('setReaction', message._id, reaction);
	  callbacks.run('afterSetReaction', message, {
		user,
		reaction,
		shouldReact,
	  });
	  isReacted = true;
	}
  
	// --- اطلاع‌رسانی به Apps
	Promise.await(
	  Apps.triggerEvent(AppEvents.IPostMessageReacted, message, user, reaction, isReacted),
	);
  }
  

export const executeSetReaction = async function (reaction, messageId, shouldReact) {
	const user = Meteor.user();

	if (!user) {
		throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'setReaction' });
	}

	const message = Messages.findOneById(messageId);
	if (!message) {
		throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'setReaction' });
	}

	const room = Rooms.findOneById(message.rid);
	if (!room) {
		throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'setReaction' });
	}

	if (!canAccessRoom(room, user)) {
		throw new Meteor.Error('not-authorized', 'Not Authorized', { method: 'setReaction' });
	}

	return setReaction(room, user, message, reaction, shouldReact);
};

Meteor.methods({
	setReaction(reaction, messageId, shouldReact) {
		try {
			return Promise.await(executeSetReaction(reaction, messageId, shouldReact));
		} catch (e) {
			if (e.error === 'error-not-allowed' && e.reason && e.details && e.details.rid) {
				api.broadcast('notify.ephemeralMessage', Meteor.userId(), e.details.rid, {
					msg: e.reason,
				});

				return false;
			}

			throw e;
		}
	},
});
