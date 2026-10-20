// Auth shim for the SFA app WebView. See app/external/EMBED_FLOW.md for the full flow.
(function () {
	'use strict';

	const LOG_PREFIX = '[embed-landing]';
	const METEOR_KEY_PATTERN = /^Meteor\./;
	const HOME_PATH = '/home';
	const THEMES = ['light', 'dark'];

	// Server `error` values from a rejected resume login (see Accounts.validateLoginAttempt) mapped to RC_ASSERTION_FAILED codes.
	const LOGIN_REJECTION_CODES = {
		'error-user-is-not-activated': 'user-inactive',
		'error-user-has-no-roles': 'user-has-no-roles',
		'error-login-blocked-for-ip': 'login-blocked',
		'error-login-blocked-for-user': 'login-blocked',
	};

	// idle → checking → (redirecting | awaiting-assertion → exchanging → (redirecting | failed)).
	// Only one flow runs per page load; the app may post RC_CONTEXT more than once.
	let state = 'idle';
	let expectedUserId = null;
	const context = { partnerId: null, tag: null };

	const log = {
		info: (msg, details) => console.info(LOG_PREFIX, msg, details ?? ''),
		warn: (msg, details) => console.warn(LOG_PREFIX, msg, details ?? ''),
		error: (msg, details) => console.error(LOG_PREFIX, msg, details ?? ''),
	};

	// `window.RCBridge` (not bare `RCBridge`) so this is a no-op outside the app instead of a ReferenceError.
	function sendToApp(message) {
		if (!window.RCBridge) {
			log.warn('RCBridge is not available; message not delivered to the app', { type: message.type });
			return;
		}
		window.RCBridge.postMessage(JSON.stringify(message));
	}

	function clearMeteorTokens() {
		for (let i = localStorage.length - 1; i >= 0; i--) {
			const key = localStorage.key(i);
			if (key && METEOR_KEY_PATTERN.test(key)) {
				localStorage.removeItem(key);
			}
		}
	}

	async function serverLogout(token, userId) {
		try {
			await fetch('/api/v1/logout', { method: 'POST', headers: { 'X-Auth-Token': token, 'X-User-Id': userId }, credentials: 'include' });
		} catch (err) {
			// Best effort: the local tokens are purged regardless.
			log.warn('Logout of stale session failed', { userId, error: String(err) });
		}
	}

	// `code` is the stable value the app should branch on; `message` is for logs only.
	class AuthError extends Error {
		constructor(code, message) {
			super(message);
			this.code = code;
		}
	}

	async function postJson(url, body) {
		let res;
		try {
			res = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				credentials: 'include',
			});
		} catch (err) {
			throw new AuthError('network-error', String(err));
		}
		if (res.status === 429) {
			throw new AuthError('rate-limited', `HTTP 429 from ${url}`);
		}
		try {
			return await res.json();
		} catch {
			throw new AuthError('invalid-response', `HTTP ${res.status} from ${url}`);
		}
	}

	// Runs the same server checks as the RC client's resume on /home (token expiry, active user, roles, login blocking),
	// so we never redirect to a session that /home would reject and replace with the login page.
	async function verifyResumeLogin(token) {
		const data = await postJson('/api/v1/login', { resume: token });
		if (data?.status !== 'success') {
			const code = LOGIN_REJECTION_CODES[data?.error] || 'session-rejected';
			throw new AuthError(code, data?.message || String(data?.error || 'resume login rejected'));
		}
		if (String(data.data?.userId) !== expectedUserId) {
			throw new AuthError('user-mismatch', 'resume login returned a different user');
		}
	}

	async function storedSessionIsValid() {
		const token = localStorage.getItem('Meteor.loginToken');
		const userId = localStorage.getItem('Meteor.userId');
		if (!token || !userId) {
			log.info('No stored session');
			return false;
		}

		if (userId !== expectedUserId) {
			log.info('Stored session belongs to another user; logging it out', { storedUserId: userId, expectedUserId });
			await serverLogout(token, userId);
			clearMeteorTokens();
			return false;
		}

		try {
			await verifyResumeLogin(token);
			return true;
		} catch (err) {
			log.info('Stored session cannot be resumed; requesting a new one', { code: err.code, message: err.message });
			clearMeteorTokens();
			return false;
		}
	}

	function requestAssertion() {
		state = 'awaiting-assertion';
		const message = { type: 'RC_NEEDS_ASSERTION', expectedUserId };
		log.info('Requesting assertion from the app', { expectedUserId });
		// Only reaches a listener when embedded in a real iframe; in the app's top-level WebView, window.parent is this window.
		window.parent.postMessage(message, '*');
		sendToApp(message);
	}

	function redirectHome() {
		state = 'redirecting';
		location.replace(HOME_PATH);
	}

	async function ensureSession() {
		state = 'checking';
		if (await storedSessionIsValid()) {
			log.info('Stored session is valid; redirecting', { userId: expectedUserId });
			redirectHome();
			return;
		}

		requestAssertion();
	}

	// The RC client applies the theme itself after the redirect (client/startup/rcbridge.ts); this only themes the shim page.
	function applyTheme(theme) {
		if (!THEMES.includes(theme)) {
			log.warn('Ignoring unknown theme', { theme });
			return;
		}
		document.documentElement.setAttribute('data-theme', theme);
	}

	function handleContext(m) {
		applyTheme(m.theme);
		if (state !== 'idle') {
			log.info('Ignoring repeated context; a session flow is already running', { state });
			return;
		}
		if (!m.expectedUserId) {
			log.warn('RC_CONTEXT has no expectedUserId; waiting');
			return;
		}

		expectedUserId = String(m.expectedUserId);
		context.partnerId = m.partnerId || null;
		context.tag = m.tag || null;
		log.info('Context received', { expectedUserId, partnerId: context.partnerId, tag: context.tag, theme: m.theme });
		ensureSession().catch((err) => failLogin('unknown', err?.message || String(err)));
	}

	function reportAuthFailure(code, message) {
		sendToApp({ type: 'RC_ASSERTION_FAILED', code, message, expectedUserId });
	}

	async function exchangeAssertion(m) {
		const data = await postJson('/api/v1/external.exchange', {
			partnerId: m.partnerId,
			userId: m.userId,
			tag: m.tag,
			exp: m.exp,
			signature: m.signature,
		});
		if (!data.success) {
			// errorType is set by external.exchange; see "Login failure codes" in EMBED_FLOW.md.
			throw new AuthError(data.errorType || 'exchange-failed', data.error || 'exchange failed');
		}
		if (String(data.userId) !== expectedUserId) {
			throw new AuthError('user-mismatch', 'server returned a different user');
		}
		return data;
	}

	function failLogin(code, message) {
		state = 'failed';
		log.error('Login failed', { userId: expectedUserId, code, message });
		clearMeteorTokens();
		reportAuthFailure(code, message);
		document.body.textContent = 'Auth failed';
	}

	async function handleAssertion(m) {
		if (state !== 'awaiting-assertion') {
			log.warn('Ignoring assertion; none was requested', { state });
			return;
		}
		if (String(m.userId) !== expectedUserId) {
			failLogin('user-mismatch', 'assertion is for a different user');
			return;
		}

		state = 'exchanging';
		log.info('Assertion received; exchanging for a login token', { userId: m.userId, exp: m.exp });
		try {
			// Purge before switching to the new session.
			clearMeteorTokens();

			const data = await exchangeAssertion(m);
			await verifyResumeLogin(data.authToken);

			localStorage.setItem('Meteor.loginToken', data.authToken);
			localStorage.setItem('Meteor.userId', data.userId);
			if (data.expiresAt) {
				localStorage.setItem('Meteor.loginTokenExpiresAt', String(data.expiresAt));
			}

			// The app keeps its loading state and 30s assertion timer until it gets this message.
			sendToApp({ type: 'RC_ASSERTION_SUCCESS', userId: data.userId });
			log.info('Login succeeded; redirecting', { userId: data.userId });
			redirectHome();
		} catch (err) {
			failLogin(err instanceof AuthError ? err.code : 'unknown', err?.message || String(err));
		}
	}

	window.addEventListener('message', (e) => {
		const m = e.data || {};
		switch (m.type) {
			case 'RC_CONTEXT':
				handleContext(m);
				break;
			case 'RC_ASSERTION':
				handleAssertion(m);
				break;
		}
	});
})();
