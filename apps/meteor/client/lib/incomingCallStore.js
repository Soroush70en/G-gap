// یک متغیر ساده برای ذخیره تماس فعلی
let currentCall = null;
const incomingCalllisteners = new Set();

export const setIncomingCall = (call) => {
	currentCall = call;
	incomingCalllisteners.forEach((fn) => fn(currentCall));
};

export const clearIncomingCall = () => {
	currentCall = null;
	incomingCalllisteners.forEach((fn) => fn(currentCall));
};

export const subscribeToIncomingCall = (fn) => {
	incomingCalllisteners.add(fn);
	fn(currentCall);
	return () => incomingCalllisteners.delete(fn);
};
