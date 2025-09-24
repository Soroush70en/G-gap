import type { ReactElement } from 'react';

import UserStatus from './UserStatus';

// type DoNotDisturbProps = Omit<ComponentProps<typeof UserStatus>, 'status'>;

function DoNotDisturb(): ReactElement {
	return <UserStatus status='doNotDisturb' />;
}

export default DoNotDisturb;
