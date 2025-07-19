// یک متغیر ساده برای ذخیره تماس فعلی
let currentCall = null;
const listeners = new Set();

export const setIncomingCall = (call) => {
	currentCall = call;
	listeners.forEach((fn) => fn(currentCall));
};

export const clearIncomingCall = () => {
	currentCall = null;
	listeners.forEach((fn) => fn(currentCall));
};

export const subscribeToIncomingCall = (fn) => {
	listeners.add(fn);
	fn(currentCall);
	return () => listeners.delete(fn);
};
