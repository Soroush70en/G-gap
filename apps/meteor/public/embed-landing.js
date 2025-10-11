(function () {
	console.log('hi');
	window.addEventListener('message', async function (e) {
		console.log('we are here');
		var m = e.data || {};
		console.log(m);
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
			console.log('dataaaaaaaaa============',data);
			localStorage.setItem('Meteor.loginToken', data.authToken);
			localStorage.setItem('Meteor.userId', data.userId);

			location.replace('/home');
		} catch (err) {
			console.error(err);
			document.body.textContent = 'Auth failed';
		}
	});
})();
