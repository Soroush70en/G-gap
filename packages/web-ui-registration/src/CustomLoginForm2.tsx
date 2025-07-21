import React, { useState, CSSProperties } from 'react';

interface LoginFormStyles {
	container: CSSProperties;
	formWrapper: CSSProperties;
	logo: CSSProperties;
	logoIcon: CSSProperties;
	logoText: CSSProperties;
	welcomeText: CSSProperties;
	inputGroup: CSSProperties;
	label: CSSProperties;
	inputWrapper: CSSProperties;
	input: CSSProperties;
	inputFocus: CSSProperties;
	closeIcon: CSSProperties;
	eyeIcon: CSSProperties;
	forgotPassword: CSSProperties;
	loginButton: CSSProperties;
	loginButtonHover: CSSProperties;
}

export const CustomLoginForm: React.FC = () => {
	const [email, setEmail] = useState<string>('amin_nemati2@yahoo.com');
	const [password, setPassword] = useState<string>('********');
	const [showPassword, setShowPassword] = useState<boolean>(false);

	const styles: LoginFormStyles = {
		container: {
			minHeight: '100vh',
			backgroundColor: '#f3f4f6',
			backgroundImage: `url("data:image/svg+xml,%3Csvg%20width%3D%221440%22%20height%3D%22896%22%20viewBox%3D%220%200%201440%20896%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20clip-path%3D%22url(%23clip0)%22%3E%3Crect%20width%3D%221440%22%20height%3D%22896%22%20fill%3D%22white%22%3E%3C/rect%3E%3Crect%20width%3D%221440%22%20height%3D%22901%22%20transform%3D%22translate(0%20-5)%22%20fill%3D%22%23f2f3f5%22%3E%3C/rect%3E%3Cg%20opacity%3D%220.3%22%3E%3Cpath%20d%3D%22M551.144%20637.885C277.724%20530.833%20142.855%20222.4%20249.907%20-51.0195%22%20stroke%3D%22url(%23paint0_linear)%22%20stroke-width%3D%224.03643%22%20stroke-linecap%3D%22round%22%3E%3C/path%3E%3Cpath%20d%3D%22M1123.26%20-80.3291C1246.5%20128.592%201177.04%20397.86%20968.123%20521.1C759.202%20644.339%20489.933%20574.881%20366.694%20365.96%22%20stroke%3D%22url(%23paint1_linear)%22%20stroke-width%3D%224.03643%22%20stroke-linecap%3D%22round%22%3E%3C/path%3E%3Cpath%20d%3D%22M1250.77%20-155.546C1415.55%20123.797%201322.68%20483.829%201043.34%20648.61C763.997%20813.39%20403.964%20720.519%20239.184%20441.176%22%20stroke%3D%22url(%23paint2_linear)%22%20stroke-width%3D%224.03643%22%20stroke-linecap%3D%22round%22%3E%3C/path%3E%3Cpath%20d%3D%22M1103.1%20749.926C767.806%20947.713%20335.655%20836.239%20137.868%20500.941C-59.9195%20165.643%2051.5547%20-266.508%20386.852%20-464.295%22%20stroke%3D%22url(%23paint3_linear)%22%20stroke-width%3D%224.03643%22%20stroke-linecap%3D%22round%22%3E%3C/path%3E%3Cpath%20d%3D%22M1073.04%20710.149C1385.7%20529.633%201492.83%20129.834%201312.31%20-182.829C1131.8%20-495.491%20731.996%20-602.617%20419.333%20-422.101%22%20stroke%3D%22url(%23paint4_linear)%22%20stroke-width%3D%224.03643%22%20stroke-linecap%3D%22round%22%3E%3C/path%3E%3Cpath%20d%3D%22M1211.56%20-179.617C1386.57%2075.0193%201319.19%20425.259%201061.06%20602.665%22%20stroke%3D%22%23F2F3F5%22%20stroke-width%3D%224.03643%22%20stroke-linecap%3D%22round%22%3E%3C/path%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22paint0_linear%22%20x1%3D%22152.99%22%20y1%3D%22196.516%22%20x2%3D%22648.061%22%20y2%3D%22390.349%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%231D74F5%22%3E%3C/stop%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%231D74F5%22%20stop-opacity%3D%220%22%3E%3C/stop%3E%3C/linearGradient%3E%3ClinearGradient%20id%3D%22paint1_linear%22%20x1%3D%22744.978%22%20y1%3D%22142.815%22%20x2%3D%22968.123%22%20y2%3D%22521.1%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%23CBCED1%22%3E%3C/stop%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23CBCED1%22%20stop-opacity%3D%220%22%3E%3C/stop%3E%3C/linearGradient%3E%3ClinearGradient%20id%3D%22paint2_linear%22%20x1%3D%22744.978%22%20y1%3D%22142.815%22%20x2%3D%221043.34%22%20y2%3D%22648.61%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%23FFD031%22%3E%3C/stop%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23FFD031%22%20stop-opacity%3D%220%22%3E%3C/stop%3E%3C/linearGradient%3E%3ClinearGradient%20id%3D%22paint3_linear%22%20x1%3D%2283.2972%22%20y1%3D%22-285.232%22%20x2%3D%22799.549%22%20y2%3D%22928.988%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%23CBCED1%22%3E%3C/stop%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23CBCED1%22%20stop-opacity%3D%220%22%3E%3C/stop%3E%3C/linearGradient%3E%3ClinearGradient%20id%3D%22paint4_linear%22%20x1%3D%22702.396%22%20y1%3D%22-585.527%22%20x2%3D%221356.1%22%20y2%3D%22546.723%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%234EBE8C%22%3E%3C/stop%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%234EBE8C%22%20stop-opacity%3D%220%22%3E%3C/stop%3E%3C/linearGradient%3E%3CclipPath%20id%3D%22clip0%22%3E%3Crect%20width%3D%221440%22%20height%3D%22896%22%20fill%3D%22white%22%3E%3C/rect%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E")`,
			backgroundRepeat: 'no-repeat',
			backgroundSize: '100vw',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			fontFamily: 'Vazir',
			padding: '20px',
		},
		formWrapper: {
			//backgroundColor: 'white',
			borderRadius: '12px',
			padding: '40px',
			width: '100%',
			maxWidth: '500px',
			textAlign: 'center',
			boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
		},
		logo: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			gap: '10px',
			marginBottom: '30px',
		},
		logoIcon: {
			width: '50px',
			height: '50px',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
		},
		logoText: {
			fontSize: '32px',
			fontWeight: 'bold',
			color: '#2d3748',
			direction: 'rtl',
		},
		welcomeText: {
			fontSize: '18px',
			color: '#4a5568',
			marginBottom: '40px',
			direction: 'rtl',
		},
		inputGroup: {
			marginBottom: '20px',
			textAlign: 'right',
		},
		label: {
			display: 'block',
			fontSize: '14px',
			color: '#4a5568',
			marginBottom: '8px',
			direction: 'rtl',
		},
		inputWrapper: {
			position: 'relative',
		},
		input: {
			width: '100%',
			padding: '10px 16px 10px 40px',
			border: '1px solid #d1d5db',
			borderRadius: '6px',
			fontSize: '16px',
			backgroundColor: '#f9fafb',
			direction: 'rtl',
			textAlign: 'right',
			outline: 'none',
			transition: 'border-color 0.2s',
			boxSizing: 'border-box',
			height: '45px',
		},
		inputFocus: {
			borderColor: '#4299e1',
		},
		closeIcon: {
			position: 'absolute',
			left: '12px',
			top: '50%',
			transform: 'translateY(-50%)',
			cursor: 'pointer',
			color: '#a0aec0',
			fontSize: '18px',
		},
		eyeIcon: {
			position: 'absolute',
			left: '12px',
			top: '50%',
			transform: 'translateY(-50%)',
			cursor: 'pointer',
			color: '#a0aec0',
			fontSize: '18px',
		},
		forgotPassword: {
			fontSize: '14px',
			color: '#4299e1',
			textDecoration: 'none',
			direction: 'rtl',
			display: 'block',
			marginTop: '8px',
		},
		loginButton: {
			width: '100%',
			padding: '14px',
			backgroundColor: '#3E476A',
			color: 'white',
			border: 'none',
			borderRadius: '6px',
			fontSize: '16px',
			cursor: 'pointer',
			marginTop: '30px',
			transition: 'background-color 0.2s',
			direction: 'rtl',
			textAlign: 'center',
		},
		loginButtonHover: {
			backgroundColor: '#1f2937',
		},
	};

	const fontFaceStyle = `
	@font-face {
    font-family: 'Vazir';
    src: url('./fonts/Vazir.woff') format('woff'), 
         url('./fonts/Vazir.woff2') format('woff2');
    font-weight: normal;
    font-style: normal;
  }
`;

	const handleEmailClear = (): void => {
		setEmail('');
	};

	const togglePasswordVisibility = (): void => {
		setShowPassword(!showPassword);
	};

	return (
		<>
			<style>{fontFaceStyle}</style>
			<div style={styles.container}>
				<div style={styles.formWrapper}>
					<div style={styles.logo}>
						<div style={styles.logoIcon}>
							<svg width='49' height='47' viewBox='0 0 49 47' fill='none' xmlns='http://www.w3.org/2000/svg'>
								<path
									d='M28.8243 10.6486L28.7549 10.6505C28.0407 10.6866 27.4727 11.277 27.4727 12C27.4727 12.723 28.0407 13.3134 28.7549 13.3495L28.8243 13.3514H31.6756C31.0419 16.7356 28.0711 19.2973 24.502 19.2973C23.332 19.2973 22.2299 19.0231 21.2531 18.5366C20.7258 18.274 20.0861 18.155 19.4376 18.2938L19.308 18.3252L17.7621 18.7385L18.1755 17.1929C18.3607 16.5007 18.2442 15.8106 17.9641 15.2483C17.4775 14.2716 17.2032 13.1697 17.2032 12C17.2032 7.96981 20.471 4.7027 24.502 4.7027C26.6133 4.7027 28.5135 5.59731 29.848 7.03194C30.3564 7.5784 31.2116 7.60933 31.7582 7.10109C32.3048 6.59282 32.3357 5.73776 31.8274 5.19125C30.0029 3.22989 27.3951 2 24.502 2C18.978 2 14.5 6.47715 14.5 12C14.5 13.5972 14.8755 15.1108 15.5443 16.4534C15.5564 16.4776 15.5607 16.4955 15.5618 16.5038L15.0488 18.4197C14.5641 20.2312 16.1884 21.891 17.9949 21.4727L18.081 21.4513L19.9973 20.9384C20.0056 20.9395 20.0235 20.9438 20.0477 20.9559C21.3906 21.6246 22.9044 22 24.502 22C29.9213 22 34.3337 17.6912 34.4992 12.3125C34.528 11.3778 33.7706 10.6486 32.882 10.6486H28.8243Z'
									fill='#434C78'
								/>
								<circle cx='24.7703' cy='12' r='1.35135' fill='#434C78' />
								<circle cx='20.7162' cy='12' r='1.35135' fill='#434C78' />
								<path
									d='M5.274 40C2.214 40 0.522 37.93 1.188 34.96L1.728 32.494H3.456L2.97 34.762C2.574 36.49 3.42 37.552 5.22 37.552H10.656V32.404L12.6 32.026V37.552H15.048C15.462 37.552 15.786 38.092 15.786 38.776C15.786 39.46 15.462 40 15.048 40H5.274ZM4.428 42.016H9.036V43.852H4.428V42.016ZM7.722 44.05L7.758 45.904H5.706L5.742 44.05H7.722ZM15.0113 40C14.6153 40 14.2733 39.46 14.2733 38.776C14.2733 38.092 14.6153 37.552 15.0113 37.552H20.4653C21.3113 37.552 21.7973 37.318 22.1033 36.886L21.9053 35.68C21.7613 34.852 21.2573 34.384 20.4473 34.384H16.5953L15.4433 31.882L19.8173 27.652L20.7533 29.56L17.8373 32.296H20.5913C22.2653 32.296 23.4533 33.286 23.7233 34.816L23.8853 35.752C24.2993 38.128 22.7513 40 20.0333 40H15.0113ZM15.2993 31.612L14.7233 30.352L17.3153 27.85L17.9273 29.092L15.2993 31.612ZM24.9785 40C24.5645 40 24.2405 39.46 24.2405 38.776C24.2405 38.092 24.5645 37.552 24.9785 37.552H29.5865C30.0005 37.552 30.3245 38.092 30.3245 38.776C30.3245 39.46 30.0005 40 29.5865 40H24.9785ZM28.828 38.776C28.828 38.092 29.17 37.552 29.566 37.552H32.698C32.572 37.192 32.482 36.796 32.482 36.364V32.476L34.408 32.098V36.184C34.408 36.976 34.984 37.552 35.758 37.552H37.18C37.594 37.552 37.918 38.092 37.918 38.776C37.918 39.46 37.594 40 37.18 40H35.668C34.624 40 33.76 39.568 33.202 38.866C33.058 39.046 32.932 39.226 32.806 39.388C32.482 39.802 32.086 40 31.456 40H29.566C29.17 40 28.828 39.46 28.828 38.776ZM30.916 43.852V42.016H35.524V43.852H30.916ZM37.1422 40C36.7462 40 36.4042 39.46 36.4042 38.776C36.4042 38.092 36.7462 37.552 37.1422 37.552H43.7482L43.3702 34.78C43.1722 33.34 42.2542 32.656 40.8682 32.89L38.2582 33.322L38.4742 31.144L40.6882 30.766C43.0822 30.388 44.9362 31.738 45.2782 34.15L45.7462 37.552H47.3842L46.7182 40H37.1422ZM42.0022 43.78V41.692H44.2162V43.78H42.0022Z'
									fill='#434C78'
								/>
							</svg>
						</div>
					</div>

					<p style={styles.welcomeText}>به پیامرسان جی گپ خوش آمدید</p>

					<div style={styles.inputGroup}>
						<label style={styles.label}>ورود</label>
						<p style={{ ...styles.label, fontSize: '12px', marginBottom: '15px' }}>جهت ورود نام کاربری و رمز عبور خود را وارد نمایید</p>
						<label style={styles.label}>نام کاربری یا ایمیل</label>
						<div style={styles.inputWrapper}>
							<input
								type='email'
								value={email}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
								style={styles.input}
								placeholder='amin_nemati2@yahoo.com'
							/>
							{email && (
								<span style={styles.closeIcon} onClick={handleEmailClear}>
									×
								</span>
							)}
						</div>
					</div>

					<div style={styles.inputGroup}>
						<label style={styles.label}>رمز ورود</label>
						<div style={styles.inputWrapper}>
							<input
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
								style={styles.input}
							/>
							<span style={styles.eyeIcon} onClick={togglePasswordVisibility}>
								👁
							</span>
						</div>
					</div>

					<button
						style={styles.loginButton}
						onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
							(e.target as HTMLButtonElement).style.backgroundColor = styles.loginButtonHover.backgroundColor as string;
						}}
						onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
							(e.target as HTMLButtonElement).style.backgroundColor = styles.loginButton.backgroundColor as string;
						}}
					>
						ورود
					</button>
				</div>
			</div>
		</>
	);
};

export default CustomLoginForm;
