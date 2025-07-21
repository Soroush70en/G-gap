import React, { useState, CSSProperties, ReactElement } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useLoginWithPassword, useSetting } from '@rocket.chat/ui-contexts';
import { useForm } from 'react-hook-form';
import EmailConfirmationForm from './EmailConfirmationForm';
import type { DispatchLoginRouter } from './hooks/useLoginRouter';
import LoginServices from './LoginServices';

type LoginErrors =
	| 'error-user-is-not-activated'
	| 'error-invalid-email'
	| 'error-login-blocked-for-ip'
	| 'error-login-blocked-for-user'
	| 'error-license-user-limit-reached'
	| 'user-not-found'
	| 'error-app-user-is-not-allowed-to-login';

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

export const CustomLoginForm = ({ setLoginRoute }: { setLoginRoute: DispatchLoginRouter }): ReactElement => {
	const {
		register,
		handleSubmit,
		setError,
		clearErrors,
		getValues,
		formState: { errors },
	} = useForm<{
		email?: string;
		username: string;
		password: string;
	}>({
		mode: 'onChange',
	});

	const [errorOnSubmit, setErrorOnSubmit] = useState<LoginErrors | undefined>(undefined);
	const [showPassword, setShowPassword] = useState<boolean>(false);
	const isResetPasswordAllowed = useSetting('Accounts_PasswordReset');
	const login = useLoginWithPassword();
	const showFormLogin = useSetting('Accounts_ShowFormLogin');

	const usernameOrEmailPlaceholder = String(useSetting('Accounts_EmailOrUsernamePlaceholder'));
	const passwordPlaceholder = String(useSetting('Accounts_PasswordPlaceholder'));

	const loginMutation: UseMutationResult<
		void,
		Error,
		{
			username: string;
			password: string;
			email?: string;
		}
	> = useMutation({
		mutationFn: (formData) => {
			return login(formData.username, formData.password);
		},
		onError: (error: any) => {
			if ([error.error, error.errorType].includes('error-invalid-email')) {
				setError('email', { type: 'invalid-email', message: 'ایمیل نامعتبر است' });
			}

			if ('error' in error && error.error !== 403) {
				setErrorOnSubmit(error.error);
				return;
			}

			setErrorOnSubmit('user-not-found');
			setError('username', { type: 'user-not-found', message: 'کاربر یافت نشد' });
			setError('password', { type: 'user-not-found', message: 'رمز عبور اشتباه است' });
		},
	});

	if (errors.email?.type === 'invalid-email') {
		return <EmailConfirmationForm onBackToLogin={() => clearErrors('email')} email={getValues('email')} />;
	}

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
							<svg width='48' height='47' viewBox='0 0 48 47' fill='none' xmlns='http://www.w3.org/2000/svg'>
								<path
									d='M28.3243 10.6486L28.2549 10.6505C27.5407 10.6866 26.9727 11.277 26.9727 12C26.9727 12.723 27.5407 13.3134 28.2549 13.3495L28.3243 13.3514H31.1756C30.5419 16.7356 27.5711 19.2973 24.002 19.2973C22.832 19.2973 21.7299 19.0231 20.7531 18.5366C20.2258 18.274 19.5861 18.155 18.9376 18.2938L18.808 18.3252L17.2621 18.7385L17.6755 17.1929C17.8607 16.5007 17.7442 15.8106 17.4641 15.2483C16.9775 14.2716 16.7032 13.1697 16.7032 12C16.7032 7.96981 19.971 4.7027 24.002 4.7027C26.1133 4.7027 28.0135 5.59731 29.348 7.03194C29.8564 7.5784 30.7116 7.60933 31.2582 7.10109C31.8048 6.59282 31.8357 5.73776 31.3274 5.19125C29.5029 3.22989 26.8951 2 24.002 2C18.478 2 14 6.47715 14 12C14 13.5972 14.3755 15.1108 15.0443 16.4534C15.0564 16.4776 15.0607 16.4955 15.0618 16.5038L14.5488 18.4197C14.0641 20.2312 15.6884 21.891 17.4949 21.4727L17.581 21.4513L19.4973 20.9384C19.5056 20.9395 19.5235 20.9438 19.5477 20.9559C20.8906 21.6246 22.4044 22 24.002 22C29.4213 22 33.8337 17.6912 33.9992 12.3125C34.028 11.3778 33.2706 10.6486 32.382 10.6486H28.3243Z'
									fill='#434C78'
								/>
								<circle cx='24.2703' cy='12' r='1.35135' fill='#434C78' />
								<circle cx='20.2162' cy='12' r='1.35135' fill='#434C78' />
								<path
									d='M5.274 40C2.214 40 0.522 37.93 1.188 34.96L1.728 32.494H3.456L2.97 34.762C2.574 36.49 3.42 37.552 5.22 37.552H10.656V32.404L12.6 32.026V37.552H15.048C15.462 37.552 15.786 38.092 15.786 38.776C15.786 39.46 15.462 40 15.048 40H5.274ZM4.428 42.016H9.036V43.852H4.428V42.016ZM7.722 44.05L7.758 45.904H5.706L5.742 44.05H7.722ZM15.0113 40C14.6153 40 14.2733 39.46 14.2733 38.776C14.2733 38.092 14.6153 37.552 15.0113 37.552H20.4653C21.3113 37.552 21.7973 37.318 22.1033 36.886L21.9053 35.68C21.7613 34.852 21.2573 34.384 20.4473 34.384H16.5953L15.4433 31.882L19.8173 27.652L20.7533 29.56L17.8373 32.296H20.5913C22.2653 32.296 23.4533 33.286 23.7233 34.816L23.8853 35.752C24.2993 38.128 22.7513 40 20.0333 40H15.0113ZM15.2993 31.612L14.7233 30.352L17.3153 27.85L17.9273 29.092L15.2993 31.612ZM30.2525 43.834C27.1205 43.834 25.4285 41.602 26.2025 38.182L26.7965 35.5H28.5065L27.9125 38.218C27.4805 40.198 28.3985 41.386 30.2705 41.386H31.4585C32.5745 41.386 33.2405 41.134 33.7265 40.648L33.5825 39.64H30.3065L30.5405 37.552H36.2825C36.6965 37.552 37.0385 38.092 37.0385 38.776C37.0385 39.46 36.6965 40 36.2825 40H35.4725C35.4725 40.216 35.4365 40.396 35.4185 40.594C35.2745 42.232 33.9605 43.834 31.1345 43.834H30.2525ZM36.2632 40C35.8672 40 35.5252 39.46 35.5252 38.776C35.5252 38.092 35.8672 37.552 36.2632 37.552H42.8693L42.4913 34.78C42.2933 33.34 41.3753 32.656 39.9893 32.89L37.3793 33.322L37.5953 31.144L39.8093 30.766C42.2033 30.388 44.0573 31.738 44.3993 34.15L44.8673 37.552H46.5053L45.8393 40H36.2632ZM41.1233 43.78V41.692H43.3373V43.78H41.1233Z'
									fill='#434C78'
								/>
							</svg>
						</div>
					</div>

					<p style={styles.welcomeText}>به پیامرسان جی گپ خوش آمدید</p>

					{showFormLogin && (
						<form
							onSubmit={handleSubmit(async (data) => {
								if (loginMutation.isLoading) {
									return;
								}
								loginMutation.mutate(data);
							})}
						>
							<div style={styles.inputGroup}>
								<label style={styles.label}>ورود</label>
								<p style={{ ...styles.label, fontSize: '12px', marginBottom: '15px' }}>جهت ورود نام کاربری و رمز عبور خود را وارد نمایید</p>
								<label style={styles.label}>نام کاربری یا ایمیل</label>
								<div style={styles.inputWrapper}>
									<input
										{...register('username', {
											required: true,
											onChange: () => {
												clearErrors(['username', 'password']);
											},
										})}
										type='text'
										style={{
											...styles.input,
											borderColor: errors.username ? '#ef4444' : styles.input.borderColor,
										}}
										placeholder={usernameOrEmailPlaceholder}
										disabled={loginMutation.isLoading}
									/>
								</div>
								{errors.username && errors.username.type === 'required' && (
									<div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', textAlign: 'right' }}>
										{'وارد کردن این فیلد اجباری است'}
									</div>
								)}
							</div>

							<div style={styles.inputGroup}>
								<label style={styles.label}>رمز ورود</label>
								<div style={styles.inputWrapper}>
									<input
										{...register('password', {
											required: true,
											onChange: () => {
												clearErrors(['username', 'password']);
											},
										})}
										type={showPassword ? 'text' : 'password'}
										style={{
											...styles.input,
											borderColor: errors.password ? '#ef4444' : styles.input.borderColor,
										}}
										placeholder={passwordPlaceholder}
										disabled={loginMutation.isLoading}
									/>
									<span style={styles.eyeIcon} onClick={togglePasswordVisibility}>
										👁
									</span>
								</div>
								{errors.password && errors.password.type === 'required' && (
									<div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', textAlign: 'right' }}>
										{'وارد کردن این فیلد اجباری است'}
									</div>
								)}
								{isResetPasswordAllowed && (
									<a
										href='#'
										style={styles.forgotPassword}
										onClick={(e) => {
											e.preventDefault();
											setLoginRoute('reset-password');
										}}
									>
										رمز عبور خود را فراموش کرده‌اید؟
									</a>
								)}
							</div>

							{/* Error Messages */}
							{errorOnSubmit === 'error-user-is-not-activated' && (
								<div
									style={{
										backgroundColor: '#fef3cd',
										border: '1px solid #fbbf24',
										borderRadius: '6px',
										padding: '12px',
										marginBottom: '20px',
										color: '#92400e',
										fontSize: '14px',
										textAlign: 'right',
									}}
								>
									{'حساب شما غیر فعال است؛ با مدیر سیستم تماس بگیرید'}
								</div>
							)}

							{errorOnSubmit === 'error-app-user-is-not-allowed-to-login' && (
								<div
									style={{
										backgroundColor: '#fef2f2',
										border: '1px solid #f87171',
										borderRadius: '6px',
										padding: '12px',
										marginBottom: '20px',
										color: '#dc2626',
										fontSize: '14px',
										textAlign: 'right',
									}}
								>
									{'امکان ورود وجود ندارد'}
								</div>
							)}

							{errorOnSubmit === 'user-not-found' && (
								<div
									style={{
										backgroundColor: '#fef2f2',
										border: '1px solid #f87171',
										borderRadius: '6px',
										padding: '12px',
										marginBottom: '20px',
										color: '#dc2626',
										fontSize: '14px',
										textAlign: 'right',
									}}
								>
									{'نام کاربری یا رمز عبور اشتباه است'}
								</div>
							)}

							{errorOnSubmit === 'error-login-blocked-for-ip' && (
								<div
									style={{
										backgroundColor: '#fef2f2',
										border: '1px solid #f87171',
										borderRadius: '6px',
										padding: '12px',
										marginBottom: '20px',
										color: '#dc2626',
										fontSize: '14px',
										textAlign: 'right',
									}}
								>
									{'آی‌پی شما مسدود شده است؛ با مدیر سیستم تماس بگیرید'}
								</div>
							)}

							{errorOnSubmit === 'error-login-blocked-for-user' && (
								<div
									style={{
										backgroundColor: '#fef2f2',
										border: '1px solid #f87171',
										borderRadius: '6px',
										padding: '12px',
										marginBottom: '20px',
										color: '#dc2626',
										fontSize: '14px',
										textAlign: 'right',
									}}
								>
									{'حساب کاربری شما موقتاً مسدود شده است'}
								</div>
							)}

							{errorOnSubmit === 'error-license-user-limit-reached' && (
								<div
									style={{
										backgroundColor: '#fef3cd',
										border: '1px solid #fbbf24',
										borderRadius: '6px',
										padding: '12px',
										marginBottom: '20px',
										color: '#92400e',
										fontSize: '14px',
										textAlign: 'right',
									}}
								>
									{'امکان ورود وجود ندارد؛ با مدیر سیستم تماس بگیرید'}
								</div>
							)}

							<button
								type='submit'
								disabled={loginMutation.isLoading}
								style={{
									...styles.loginButton,
									opacity: loginMutation.isLoading ? 0.6 : 1,
									cursor: loginMutation.isLoading ? 'not-allowed' : 'pointer',
								}}
								onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
									if (!loginMutation.isLoading) {
										(e.target as HTMLButtonElement).style.backgroundColor = styles.loginButtonHover.backgroundColor as string;
									}
								}}
								onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
									if (!loginMutation.isLoading) {
										(e.target as HTMLButtonElement).style.backgroundColor = styles.loginButton.backgroundColor as string;
									}
								}}
							>
								{loginMutation.isLoading ? 'در حال ورود...' : 'ورود'}
							</button>
						</form>
					)}

					<LoginServices disabled={loginMutation.isLoading} />
				</div>
			</div>
		</>
	);
};

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
		width: '10rem',
		height: '10rem',
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

export default CustomLoginForm;
