(function () {
	let expectedUserId = null;
	let context = { partnerId: null, tag: null };
	function sendToFlutter(msg) {
		RCBridge?.postMessage(msg);
	}

	function clearMeteorTokens() {
		// Be thorough: remove known Meteor/Rocket.Chat keys
		const keys = ['Meteor.loginToken', 'Meteor.userId', 'Meteor.loginTokenExpires', 'Meteor.loginTokenExpiresAt'];
		for (const k of keys) localStorage.removeItem(k);

		// Optional: clear any other Meteor.* items
		for (let i = localStorage.length - 1; i >= 0; i--) {
			const key = localStorage.key(i);
			if (key && /^Meteor\./.test(key)) localStorage.removeItem(key);
		}
	}

	async function serverLogout(token, userId) {
		try {
			await fetch('/api/v1/logout', {
				method: 'POST',
				headers: { 'X-Auth-Token': token, 'X-User-Id': userId },
				credentials: 'include',
			});
		} catch {
			/* ignore; best-effort */
		}
	}

	async function tokenBelongsToExpectedUser() {
		const token = localStorage.getItem('Meteor.loginToken');
		const userId = localStorage.getItem('Meteor.userId');
		if (!token || !userId) return false;
		if (!expectedUserId) return false;

		if (userId !== expectedUserId) {
			// Old session for someone else → invalidate + purge
			await serverLogout(token, userId);
			clearMeteorTokens();
			return false;
		}

		// Verify with the server this token is still valid for this user
		try {
			const res = await fetch('/api/v1/me', {
				method: 'GET',
				headers: { 'X-Auth-Token': token, 'X-User-Id': userId },
				credentials: 'include',
			});
			console.log('===============RES===============');
			console.log(res);
			if (!res.ok) return false;
			const data = await res.json();
			// Typical shape: { success: true, user: { _id: '...' } }
			const serverUserId = data?.user?._id || data?._id;
			return !!data?.success && serverUserId === expectedUserId;
		} catch {
			return false;
		}
	}

	async function ensureSession() {
		console.log('ensureSession');
		if (!expectedUserId) {
			console.log('!expectedUserId');
			return;
		} // wait for RC_CONTEXT first

		if (await tokenBelongsToExpectedUser()) {
			console.log('tokenBelongsToExpectedUser');
			location.replace('/home');
			return;
		}
		console.log('trying to post...');
		// Ask the parent for a fresh assertion bound to this expected user
		window.parent.postMessage(
			{
				type: 'RC_NEEDS_ASSERTION',
				expectedUserId,
			},
			'*',
		);

		let x = JSON.stringify({
			type: 'RC_NEEDS_ASSERTION',
			expectedUserId,
		});

		setTimeout(sendToFlutter(x), timeout);
	}

	async function handleMessage(e) {
		const m = e.data || {};

		if (m.type === 'RC_CONTEXT') {
			console.log('RC_CONTEXT received');
			expectedUserId = String(m.expectedUserId || '');
			context.partnerId = m.partnerId || null;
			context.tag = m.tag || null;
			console.log(expectedUserId, context);
			ensureSession();
			return;
		}

		if (m.type === 'RC_ASSERTION') {
			console.log('RC_ASSERTION received');
			// Hard guard: only accept assertion for the expected user
			if (!expectedUserId || String(m.userId) !== expectedUserId) {
				console.log('expectedUserId', expectedUserId);
				console.log('!expectedUserId || String(m.userId) !== expectedUserId');
				return;
			}

			try {
				// Extra safety: purge before switching to the new session
				clearMeteorTokens();

				const res = await fetch('/api/v1/external.exchange', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						partnerId: m.partnerId,
						userId: m.userId,
						tag: m.tag,
						exp: m.exp,
						// jti: m.jti,
						signature: m.signature,
					}),
					credentials: 'include',
				});
				const data = await res.json();
				console.log('===================DATA===================');
				console.log(data);
				if (!data.success) throw new Error(data.error || 'exchange failed');

				// Final cross-check: server returned userId must match expected
				if (String(data.userId) !== expectedUserId) {
					throw new Error('user mismatch');
				}

				localStorage.setItem('Meteor.loginToken', data.authToken);
				localStorage.setItem('Meteor.userId', data.userId);
				if (data.expiresAt) {
					localStorage.setItem('Meteor.loginTokenExpiresAt', String(data.expiresAt));
				}

				location.replace('/home');
			} catch (err) {
				console.error(err);
				clearMeteorTokens();
				document.body.textContent = 'Auth failed';
			}
		}
	}

	window.addEventListener('message', handleMessage);
})();
