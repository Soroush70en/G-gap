import React from 'react';
import { CustomSounds } from '../../app/custom-sounds/client/lib/CustomSounds';
import { getUserPreference } from '../../app/utils';
import { getUserAvatarURL } from '../../app/utils/lib/getUserAvatarURL';

const IncomingCallPanel = ({ visible, callerName, onJoin, onDismiss, username }) => {
	if (!visible) return null;

	setTimeout(() => {
		_onDismiss();
	}, 30000);

	const userId = Meteor.userId();
	const audioVolume = getUserPreference(userId, 'notificationsSoundVolume');

	let sound;
	sound = CustomSounds.play('ringtone', {
		volume: Number((audioVolume / 100).toPrecision(2)),
		loop: true,
	});

	console.log('getUserAvatarURL for:' + username);
	console.log(getUserAvatarURL(username));
	const avatarUrl = getUserAvatarURL(username) ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

	const _onDismiss = () => {
		sound.pause();
		onDismiss();
	};

	const _onJoin = () => {
		sound.pause();
		onJoin();
	};

	return (
		<>
			<style jsx>{`
				@keyframes slideIn {
					from {
						transform: translateX(100%);
						opacity: 0;
					}
					to {
						transform: translateX(0);
						opacity: 1;
					}
				}

				.overlay {
					position: fixed;
					top: 20px;
					right: 20px;
					background: white;
					border-radius: 12px;
					box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
					padding: 20px;
					z-index: 10000;
					min-width: 300px;
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
					border: 1px solid #e0e0e0;
					animation: slideIn 0.3s ease-out;
				}

				.header {
					display: flex;
					align-items: center;
					margin-bottom: 15px;
				}

				.avatar {
					width: 48px;
					height: 48px;
					border-radius: 50%;
					margin-right: 12px;
				}

				.sender-name {
					font-weight: 600;
					font-size: 16px;
					color: #333;
				}

				.call-status {
					font-size: 14px;
					color: #666;
				}

				.buttons {
					display: flex;
					gap: 12px;
				}

				.button {
					flex: 1;
					border: none;
					border-radius: 8px;
					padding: 12px 16px;
					font-size: 14px;
					font-weight: 600;
					cursor: pointer;
					transition: background 0.2s;
				}

				.accept-button {
					background: #22c55e;
					color: white;
				}

				.accept-button:hover {
					background: #16a34a;
				}

				.decline-button {
					background: #ef4444;
					color: white;
				}

				.decline-button:hover {
					background: #dc2626;
				}
			`}</style>

			<div className='overlay'>
				<div className='header'>
					<img
						src={avatarUrl}
						className='avatar'
						alt='User avatar'
						onError={(e) => {
							e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed={senderName}`;
						}}
					/>
					<div>
						<div className='sender-name'>{callerName}</div>
						<div className='call-status'>Incoming video call...</div>
					</div>
				</div>
				<div className='buttons'>
					<button className='button accept-button' onClick={_onJoin}>
						✅ Accept
					</button>
					<button className='button decline-button' onClick={_onDismiss}>
						❌ Decline
					</button>
				</div>
			</div>
		</>
	);
};

export default IncomingCallPanel;
