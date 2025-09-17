import React, { useState, memo } from 'react';
import { AlertTriangle, Download, X, CheckCircle, Info } from 'lucide-react';

type DeprecationBannerModalProps = {
	isVisible: boolean;
	onDownload: () => void;
	onClose?: () => void;
	isRTL: boolean;
	isForced?: boolean;
};

const DeprecationBannerModal: FC<DeprecationBannerModalProps> = ({ isVisible, onDownload, onClose, isRTL = false, isForced = false }) => {
	if (!isVisible) return null;

	const isDanger = isForced;
	const primaryColor = '#2096E0';
	const primaryColorHover = '#1c85c7';
	const warningBgColor = isDanger ? '#fefce8' : '#fefce8';
	const warningBorderColor = isDanger ? '#facc15' : '#f59e0b';
	const warningTextColor = isDanger ? '#92400e' : '#92400e';

	const styles = {
		overlay: {
			position: 'fixed',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: 'rgba(0, 0, 0, 0.5)',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			zIndex: 9999,
			padding: '16px',
			direction: isRTL ? 'rtl' : 'ltr',
		},
		modal: {
			backgroundColor: 'white',
			borderRadius: '8px',
			boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
			maxWidth: '448px',
			width: '100%',
			margin: '0 16px',
			//border: `2px solid ${primaryColor}`,
			direction: isRTL ? 'rtl' : 'ltr',
			position: 'relative',
		},
		header: {
			backgroundColor: '#FFFFFF',
			color: '#161B1D',
			padding: '16px',
			borderTopLeftRadius: '8px',
			borderTopRightRadius: '8px',
			borderBottom: `2px solid #C4CED4`,
		},
		headerContent: {
			display: 'flex',
			alignItems: 'center',
			gap: '8px',
			flexDirection: isRTL ? 'row' : 'row-reverse',
		},
		closeButton: {
			position: 'absolute',
			top: '8px',
			right: isRTL ? 'auto' : '8px',
			left: isRTL ? '8px' : 'auto',
			backgroundColor: 'rgba(255, 255, 255, 0.1)',
			border: 'none',
			borderRadius: '4px',
			color: 'white',
			cursor: 'pointer',
			padding: '4px',
			transition: 'background-color 0.2s',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
		},
		closeButtonHover: {
			backgroundColor: 'rgba(255, 255, 255, 0.2)',
		},
		icon: {
			width: '32px',
			height: '32px',
			animation: isDanger ? 'pulse 2s infinite' : 'none',
		},
		title: {
			fontSize: '1.5rem',
			//fontWeight: 'bold',
			margin: 0,
		},
		body: {
			padding: '24px',
		},
		content: {
			marginBottom: '16px',
		},
		mainText: {
			color: '#374151',
			marginBottom: '12px',
			fontSize: '16px',
		},
		subText: {
			color: '#6b7280',
			marginBottom: '16px',
			fontSize: '14px',
			lineHeight: '1.5',
		},
		warningBox: {
			backgroundColor: warningBgColor,
			borderLeft: isRTL ? 'none' : `4px solid ${warningBorderColor}`,
			borderRight: isRTL ? `4px solid ${warningBorderColor}` : 'none',
			padding: '12px',
			marginBottom: '16px',
			borderRadius: '4px',
		},
		warningText: {
			fontSize: '14px',
			color: warningTextColor,
		},
		buttonContainer: {
			display: 'flex',
			gap: '12px',
			flexDirection: isRTL ? 'row-reverse' : 'row',
		},
		downloadButton: {
			flex: '0 0 auto',
			backgroundColor: primaryColor,
			color: 'white',
			fontWeight: '600',
			padding: '8px 12px',
			borderRadius: '8px',
			border: 'none',
			cursor: 'pointer',
			transition: 'background-color 0.2s',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			gap: '8px',
			fontSize: '16px',
			flexDirection: isRTL ? 'row' : 'row-reverse',
			boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
		},
		downloadButtonHover: {
			backgroundColor: primaryColorHover,
		},
		gotItButton: {
			flex: '1',
			backgroundColor: 'white',
			color: '#374151',
			fontWeight: '600',
			padding: '8px 12px',
			borderRadius: '8px',
			border: '2px solid #d1d5db',
			cursor: 'pointer',
			transition: 'all 0.2s',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			gap: '8px',
			fontSize: '16px',
			flexDirection: isRTL ? 'row' : 'row-reverse',
		},
		gotItButtonHover: {
			backgroundColor: '#f9fafb',
			borderColor: '#9ca3af',
		},
		footerText: {
			fontSize: '12px',
			color: '#6b7280',
			marginTop: '12px',
			textAlign: 'center',
		},
	};

	const [isDownloadHovered, setIsDownloadHovered] = useState(false);
	const [isGotItHovered, setIsGotItHovered] = useState(false);
	const [isCloseHovered, setIsCloseHovered] = useState(false);

	const handleClose = () => {
		if (!isForced && onClose) {
			onClose();
		}
	};

	const handleGotIt = () => {
		if (onClose) {
			onClose();
		}
	};

	return (
		<>
			<style>
				{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
			</style>
			<div style={styles.overlay}>
				<div style={styles.modal}>
					{!isForced && (
						<button
							onClick={handleClose}
							style={{
								...styles.closeButton,
								...(isCloseHovered ? styles.closeButtonHover : {}),
							}}
							onMouseEnter={() => setIsCloseHovered(true)}
							onMouseLeave={() => setIsCloseHovered(false)}
						>
							<X size={16} />
						</button>
					)}

					<div style={styles.header}>
						<div style={styles.headerContent}>
							{isForced ? (
								<AlertTriangle style={styles.icon} color='white' fill='red' />
							) : (
								<Info style={styles.icon} color='white' fill='#2096E0' />
							)}
							<h2 style={styles.title}>
								{isRTL ? (isForced ? 'انقضای نسخه جی‌گپ' : 'به‌روزرسانی نرم‌افزار') : isForced ? 'Version Deprecated' : 'Update Available'}
							</h2>
						</div>
					</div>

					<div style={styles.body}>
						<div style={styles.content}>
							<p style={styles.mainText}>
								<strong>
									{isRTL
										? isForced
											? 'نسخه فعلی نرم‌افزار شما منقضی شده است'
											: 'نسخه جدیدی از نرم‌افزار موجود است'
										: isForced
										? 'Your current version is no longer supported.'
										: 'A new version is available for download.'}
								</strong>
							</p>
							<p style={styles.subText}>
								{isRTL
									? isForced
										? 'برای تجربه کاربری بهتر و دسترسی به آخرین تغییرات، آخرین نسخه را از لینک زیر دریافت و نصب نمایید.'
										: 'برای دسترسی به بهبودهای جدید و عملکرد بهتر، توصیه می‌کنیم نسخه جدید را دانلود کنید.'
									: isForced
									? 'To continue using this application securely and access the latest features, you must download and install the new version immediately.'
									: 'We recommend updating to get the latest features, security improvements, and bug fixes.'}
							</p>
							{isForced && (
								<div style={styles.warningBox}>
									<div style={styles.warningText}>
										<p>
											<strong>{isRTL ? 'نکته مهم:' : 'Important:'}</strong>
										</p>
										<p>
											{isRTL
												? ' این نسخه به طور کامل از کار افتاده است و امکان استفاده از آن وجود ندارد.'
												: ' This version will stop working soon. Update now to avoid service interruption.'}
										</p>
									</div>
								</div>
							)}
						</div>

						<div style={styles.buttonContainer}>
							<button
								onClick={onDownload}
								style={{
									...styles.downloadButton,
									...(isDownloadHovered ? styles.downloadButtonHover : {}),
								}}
								onMouseEnter={() => setIsDownloadHovered(true)}
								onMouseLeave={() => setIsDownloadHovered(false)}
							>
								<Download size={20} />
								<span>{isRTL ? 'دانلود نسخه جدید' : 'Download New Version'}</span>
							</button>

							<button
								onClick={handleGotIt}
								style={{
									...styles.gotItButton,
									...(isGotItHovered ? styles.gotItButtonHover : {}),
								}}
								onMouseEnter={() => setIsGotItHovered(true)}
								onMouseLeave={() => setIsGotItHovered(false)}
							>
								<CheckCircle size={20} />
								<span>{isRTL ? 'متوجه شدم!' : 'Got it!'}</span>
							</button>
						</div>

						{isForced && (
							<p style={styles.footerText}>
								{isRTL ? 'این پیام تنها پس از به روز رسانی بسته خواهد شد' : 'This message will only disappear after updating'}
							</p>
						)}
					</div>
				</div>
			</div>
		</>
	);
};

export default memo(DeprecationBannerModal);
