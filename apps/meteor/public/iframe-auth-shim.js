(function () {
	var ALLOWED_PARENTS = ['https://partner.example.com']; // <-- set this!

	function ok(o) {
		return ALLOWED_PARENTS.indexOf(o) !== -1;
	}

	window.addEventListener('message', async function (e) {
		if (!ok(e.origin) || e.source !== window.parent) return; // extra check
		var m = e.data || {};
		if (m.type !== 'RC_ASSERTION') return;

		try {
			const res = await fetch('/api/v1/external.exchange', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					partnerId: m.partnerId,
					userId: m.userId,
					tag: m.tag,
					exp: m.exp,
					jti: m.jti,
					signature: m.signature,
				}),
				credentials: 'include',
			});
			const data = await res.json();
			if (!data.success) throw new Error(data.error || 'exchange failed');

			localStorage.setItem('Meteor.loginToken', data.data.authToken);
			localStorage.setItem('Meteor.userId', data.data.userId);

			location.replace('/home');
		} catch (err) {
			console.error(err);
			document.body.textContent = 'Auth failed';
		}
	});
})();
