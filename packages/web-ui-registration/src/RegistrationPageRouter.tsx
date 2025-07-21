import type { ReactElement } from 'react';
import ResetPasswordForm from './ResetPasswordForm';
import { useLoginRouter } from './hooks/useLoginRouter';
import RegisterSecretPageRouter from './RegisterSecretPageRouter';
import RegisterTemplate from './RegisterTemplate';
import CustomLoginForm from './CustomLoginForm';

export const RegistrationPageRouter = ({
	defaultRoute = 'login',
}: {
	defaultRoute?: 'login' | 'register' | 'reset-password' | 'secret-register';
}): ReactElement | null => {
	const [route, setLoginRoute] = useLoginRouter(defaultRoute);

	if (route === 'login') {
		return (
			<CustomLoginForm setLoginRoute={setLoginRoute} />
			// <RegisterTemplate>
			// 	<LoginForm setLoginRoute={setLoginRoute} />
			// 	{/* <CustomLoginForm /> */}
			// </RegisterTemplate>
		);
	}

	if (route === 'reset-password') {
		return (
			<RegisterTemplate>
				<ResetPasswordForm setLoginRoute={setLoginRoute} />
			</RegisterTemplate>
		);
	}

	if (route === 'secret-register' || route === 'register') {
		return <RegisterSecretPageRouter origin={route} setLoginRoute={setLoginRoute} />;
	}

	return null;
};

export default RegistrationPageRouter;
