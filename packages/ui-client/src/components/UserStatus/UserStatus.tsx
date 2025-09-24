import { StatusBullet } from '@rocket.chat/fuselage';
import { useTranslation } from '@rocket.chat/ui-contexts';
import type { ComponentProps, ReactElement } from 'react';
import { memo } from 'react';
import DoNotDisturbIcon from './CustomStatus/DoNotDisturbIcon';
export type UserStatusProps = {
	small?: boolean;
	statusText?: string;
} & ComponentProps<typeof StatusBullet>;

function UserStatus({ small, status, statusText, ...props }: UserStatusProps): ReactElement {
	const size = small ? 'small' : 'large';
	const t = useTranslation();
	switch (status) {
		case 'online':
			return <StatusBullet size={size} status={status} title={statusText || t('Online')} {...props} />;
		case 'busy':
			return <DoNotDisturbIcon title={t('Busy')} />;
		case 'away':
			return <StatusBullet size={size} status={status} title={statusText || t('Away')} {...props} />;
		case 'offline':
			return <StatusBullet size={size} status={status} title={statusText || t('Offline')} {...props} />;
		case 'disabled':
			return <StatusBullet size={size} status={status} title={statusText || t('Disabled')} {...props} />;
		case 'doNotDisturb':
			return <StatusBullet size={size} status={'busy'} title={statusText || t('DoNotDisturb')} {...props} />;
		default:
			return <StatusBullet size={size} title={t('Loading')} {...props} />;
	}
}

export default memo(UserStatus);
