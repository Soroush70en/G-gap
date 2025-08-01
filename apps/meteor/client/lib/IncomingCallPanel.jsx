import React, { useMemo } from 'react';
import {
	VideoConfPopup,
	VideoConfPopupContent,
	VideoConfPopupControllers,
	VideoConfController,
	useVideoConfControllers,
	VideoConfButton,
	VideoConfPopupFooter,
	VideoConfPopupFooterButtons,
	VideoConfPopupTitle,
	VideoConfPopupHeader,
} from '@rocket.chat/ui-video-conf';
import { useTranslation } from '@rocket.chat/ui-contexts';
import { useEndpointData } from '../hooks/useEndpointData';
import { AsyncStatePhase } from '../hooks/useAsyncState';
import { Skeleton } from '@rocket.chat/fuselage';
import { CustomSounds } from '../../app/custom-sounds/client/lib/CustomSounds';

// Mock functions and hooks since the original imports are not available in this environment.
// This allows the component to render without compilation errors.
const useThemeMode = () => [null, null, 'light']; // Mock hook to return a light theme by default
const getUserPreference = () => 100; // Mock function

const IncomingCallPanel = ({ visible, callerName, onJoin, onDismiss, username, callId }) => {
	if (!visible) return null;

	const t = useTranslation();
	const { controllersConfig, handleToggleMic, handleToggleCam } = useVideoConfControllers();
	const [, , theme] = useThemeMode();
	const isDark = theme === 'dark';
	const params = useMemo(() => ({ callId }), [callId]);
	const { phase, value } = useEndpointData('/v1/video-conference.info', { params });
	const showMic = Boolean(value?.capabilities?.mic);
	const showCam = Boolean(value?.capabilities?.cam);

	// Set a timeout to automatically dismiss the call notification
	// We are using a useEffect hook to properly manage the timer's lifecycle.
	React.useEffect(() => {
		const timer = setTimeout(() => {
			_onDismiss();
		}, 40000);

		// Cleanup the timer when the component unmounts or visibility changes
		return () => clearTimeout(timer);
	}, [visible]);

	useEffect(() => {
		return () => {
			return sound?.pause();
		};
	}, []);

	const userId = Meteor.userId();
	const audioVolume = getUserPreference(userId, 'notificationsSoundVolume');

	let sound;
	sound = CustomSounds.play('ringtone', {
		volume: Number((audioVolume / 100).toPrecision(2)),
		loop: true,
	});

	// Wrapper function to stop the sound and dismiss
	const _onDismiss = () => {
		if (sound) sound.pause();
		if (onDismiss) onDismiss();
	};

	// Wrapper function to stop the sound and join the call
	const _onJoin = () => {
		if (sound) sound.pause();
		if (onJoin) onJoin();
	};

	// SVGs for icons to avoid external dependencies
	const ScreenShareIcon = () => (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='24'
			height='24'
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
		>
			<path d='M13 17l5-5-5-5' />
			<path d='M18 12H2' />
			<path d='M21 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z' />
		</svg>
	);

	const MicrophoneIcon = () => (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='24'
			height='24'
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
		>
			<path d='M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z' />
			<path d='M19 10v2a7 7 0 0 1-14 0v-2' />
			<line x1='12' x2='12' y1='19' y2='22' />
		</svg>
	);

	const CloseIcon = () => (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='20'
			height='20'
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth='2.5'
			strokeLinecap='round'
			strokeLinejoin='round'
		>
			<line x1='18' y1='6' x2='6' y2='18' />
			<line x1='6' y1='6' x2='18' y2='18' />
		</svg>
	);

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
					background: ${isDark ? 'var(--rcx-color-surface-dark, #2f343d)' : 'var(--rcx-color-surface-light, white)'};
					border-radius: 8px;
					box-shadow: 0 4px 12px ${isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.15)'};
					padding: 16px;
					z-index: 10000;
					width: 320px;
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
					border: 1px solid ${isDark ? 'var(--rcx-color-stroke-dark, #4a4a4a)' : 'var(--rcx-color-stroke-light, #e0e0e0)'};
					animation: slideIn 0.3s ease-out;
					display: flex;
					flex-direction: column;
					gap: 16px;
					color: ${isDark ? 'var(--rcx-color-font-white, #ffffff)' : 'var(--rcx-color-font-default, #222222)'};
				}

				.header {
					display: flex;
					justify-content: space-between;
					align-items: center;
				}

				.title {
					font-size: 14px;
					font-weight: 500;
				}

				.header-icons {
					display: flex;
					align-items: center;
					gap: 8px;
				}

				.icon-wrapper {
					display: flex;
					align-items: center;
					justify-content: center;
					color: ${isDark ? '#c7c7c7' : '#555'};
				}

				.mic-icon-wrapper {
					background-color: var(--rcx-color-button-background-primary-default, #0284c7);
					color: white;
					border-radius: 4px;
					padding: 4px;
				}

				.caller-info {
					display: flex;
					align-items: center;
					gap: 12px;
				}

				.avatar {
					width: 40px;
					height: 40px;
					border-radius: 8px;
					background-color: #7c3aed; /* A nice purple */
					color: white;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 20px;
					font-weight: bold;
				}

				.status-dot {
					width: 10px;
					height: 10px;
					background-color: #22c55e; /* Green */
					border-radius: 50%;
				}

				.caller-name {
					font-size: 16px;
					font-weight: 600;
				}

				/* Button styles */
				.buttons {
					display: flex;
					gap: 8px;
				}
				.button {
					border: none;
					border-radius: 4px;
					padding: 10px 16px;
					font-size: 14px;
					cursor: pointer;
					transition: background-color 0.2s, color 0.2s, opacity 0.2s;
					text-align: center;
				}
				.accept-button,
				.decline-button {
					flex-grow: 1; /* This makes both buttons take equal space */
				}
				.accept-button {
					background: #0284c7;
					color: white;
				}
				.accept-button:hover {
					opacity: 0.9;
				}
				.decline-button {
					background: ${isDark ? '#404040' : '#e5e5e5'};
					color: #ef4444;
				}
				.decline-button:hover {
					background: ${isDark ? '#525252' : '#d4d4d4'};
				}
				.dismiss-button {
					background: ${isDark ? '#404040' : '#e5e5e5'};
					color: ${isDark ? '#e5e5e5' : '#404040'};
					flex-grow: 0;
					padding: 10px;
					display: flex;
					align-items: center;
					justify-content: center;
				}
				.dismiss-button:hover {
					background: ${isDark ? '#525252' : '#d4d4d4'};
				}
			`}</style>

			<div className='overlay'>
				<VideoConfPopupHeader>
					<VideoConfPopupTitle text={t('Incoming_call_from')} />
					{phase === AsyncStatePhase.LOADING && <Skeleton />}
					{phase === AsyncStatePhase.RESOLVED && (showMic || showCam) && (
						<VideoConfPopupControllers>
							{showCam && (
								<VideoConfController
									active={controllersConfig.cam}
									title={controllersConfig.cam ? t('Cam_on') : t('Cam_off')}
									icon={controllersConfig.cam ? 'video' : 'video-off'}
									onClick={handleToggleCam}
								/>
							)}
							{showMic && (
								<VideoConfController
									active={controllersConfig.mic}
									title={controllersConfig.mic ? t('Mic_on') : t('Mic_off')}
									icon={controllersConfig.mic ? 'mic' : 'mic-off'}
									onClick={handleToggleMic}
								/>
							)}
						</VideoConfPopupControllers>
					)}
				</VideoConfPopupHeader>

				<div className='caller-info'>
					<div className='avatar'>{(callerName || ' ').charAt(0).toUpperCase()}</div>
					<div className='status-dot'></div>
					<div className='caller-name'>{callerName}</div>
				</div>

				<div className='buttons'>
					<button className='button accept-button' onClick={_onJoin}>
						Accept
					</button>
					<button className='button decline-button' onClick={_onDismiss}>
						Decline
					</button>
					<button className='button dismiss-button' onClick={_onDismiss}>
						<CloseIcon />
					</button>
				</div>
			</div>
		</>
	);
};

export default IncomingCallPanel;
