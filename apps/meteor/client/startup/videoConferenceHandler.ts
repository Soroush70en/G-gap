import { Meteor } from 'meteor/meteor';

// Type definitions
interface MessagePayload {
	message?: {
		t: string;
		type: string;
	};
	sender?: {
		_id: string;
		name?: string;
		username?: string;
	};
	callId?: string;
}

interface MessageParams {
	uid: string;
	type: string;
	name?: string;
	callId?: string;
	username?: string;
	user?: {
		name: string;
	};
}

interface MessageArg {
	payload?: MessagePayload;
	action?: string;
	params?: MessageParams;
}

interface Message {
	fields?: {
		args?: MessageArg[];
	};
}

interface IncomingCall {
	callerId: string;
	callerName: string;
	callId?: string;
	username?: string;
}

interface ToastMessage {
	type: 'success' | 'error' | 'info' | 'warning';
	message: string;
}

// Utility functions
const getFirstArg = (message: Message): MessageArg | null => {
	return message?.fields?.args?.[0] || null;
};

const createIncomingCall = ( callerId?: string, callerName?: string, callId?: string, username?: string): IncomingCall => ({
	callerId: callerId ?? '',
	callerName: callerName ?? 'ناشناس',
	callId,
	username,
});

// Condition checkers
const isVideoConfMessage = (arg: MessageArg, userId: string | null): boolean => {
	const payload = arg.payload;
	return !!(payload?.message?.t === 'videoconf' && payload?.sender?._id !== userId && payload?.message?.type === 'videoconference');
};

const isVideoConfJoin = (arg: MessageArg, userId: string | null): boolean => {
	const params = arg.params;
	return !!(arg.action === 'join' && params?.uid === userId && params?.type === 'videoconference.add');
};

const isVideoConfAccepted = (arg: MessageArg, userId: string | null): boolean => {
	return !!(arg.action === 'videoConference/accepted' && arg.params?.uid !== userId);
};

// Handler functions - these will need to be injected as dependencies
const handleIncomingCall = (arg: MessageArg, setIncomingCall: (call: IncomingCall) => void): void => {
	const payload = arg.payload!;
	const { sender, callId } = payload;
	setIncomingCall(createIncomingCall(sender?.name, callId, sender?.username));
};

const handleVideoConfJoin = (arg: MessageArg, setIncomingCall: (call: IncomingCall) => void): void => {
	const params = arg.params!;
	const { name, callId, username } = params;
	setIncomingCall(createIncomingCall(name, callId, username));
};

const handleVideoConfAccepted = (arg: MessageArg, dispatchToastMessage: (message: ToastMessage) => void): void => {
	const userName = arg.params?.user?.name || 'کاربر';
	dispatchToastMessage({
		type: 'success',
		message: `${userName} تماس را پذیرفت.`,
	});

	console.log('videoConference/accepted');
	console.log('This UserId: ' + Meteor.userId());
	console.log('New UserId: ' + arg.params?.uid);
};

// Main processor function
export const processVideoConferenceMessage = (
	message: Message,
	setIncomingCall: (call: IncomingCall) => void,
	dispatchToastMessage: (message: ToastMessage) => void,
): void => {
	const firstArg = getFirstArg(message);
	if (!firstArg) return;

	const currentUserId = Meteor.userId();

	// Handle incoming call scenarios
	try {
		if (isVideoConfMessage(firstArg, currentUserId)) {
			handleIncomingCall(firstArg, setIncomingCall);
			return;
		}

		if (isVideoConfJoin(firstArg, currentUserId)) {
			handleVideoConfJoin(firstArg, setIncomingCall);
			return;
		}
	} catch (e) {
		console.error('Error handling incoming call:', e);
	}

	// Handle video conference acceptance
	try {
		if (isVideoConfAccepted(firstArg, currentUserId)) {
			handleVideoConfAccepted(firstArg, dispatchToastMessage);
		}
	} catch (e) {
		console.error('Error handling video conference acceptance:', e);
	}
};

// Export types for use in other files
export type { IncomingCall, Message, ToastMessage };
