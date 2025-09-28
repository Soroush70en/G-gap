import { StatusBullet } from '@rocket.chat/fuselage';
import { useTranslation } from '@rocket.chat/ui-contexts';
import type { ComponentProps, ReactElement } from 'react';
import { memo } from 'react';
import DoNotDisturbIcon from './CustomStatus/DoNotDisturbIcon';

// Extend the allowed statuses locally
type BuiltInStatus = NonNullable<ComponentProps<typeof StatusBullet>['status']>;
type ExtendedStatus = BuiltInStatus | 'doNotDisturb';

export type UserStatusProps = {
	small?: boolean;
	statusText?: string;
	status?: ExtendedStatus;
} & Omit<ComponentProps<typeof StatusBullet>, 'status' | 'size' | 'title'>;

function UserStatus({ small, status = 'loading', statusText, ...props }: UserStatusProps): ReactElement {
	const size = small ? 'small' : 'large';
	const t = useTranslation();

	switch (status) {
		case 'online':
			return <StatusBullet size={size} status='online' title={statusText || t('Online')} {...props} />;

		case 'busy':
			// Your custom red bullet for Busy
			return <DoNotDisturbIcon size={size} title={statusText || t('Busy')} />;

		case 'away':
			return <StatusBullet size={size} status='away' title={statusText || t('Away')} {...props} />;

		case 'offline':
			return <StatusBullet size={size} status='offline' title={statusText || t('Offline')} {...props} />;

		case 'disabled':
			return <StatusBullet size={size} status='disabled' title={statusText || t('Disabled')} {...props} />;

		case 'doNotDisturb':
			// Map DND to the built-in Busy glyph (the minus-in-circle)
			return <StatusBullet size={size} status='busy' title={statusText || t('DoNotDisturb')} {...props} />;

		default:
			return <StatusBullet size={size} status='loading' title={t('Loading')} {...props} />;
	}
}

export default memo(UserStatus);
