import type { SVGProps } from 'react';

type DoNotDisturbProps = {
	title: string;
	size?: 'small' | 'large';
} & Omit<SVGProps<SVGSVGElement>, 'size' | 'title'>;

// Match Fuselage's small/large sizing
const pxFor = (size?: 'small' | 'large') => (size === 'small' ? 10 : 14);

const DoNotDisturbIcon = ({ title, size = 'large', className = '', ...rest }: DoNotDisturbProps) => {
	const px = pxFor(size);
	return (
		<svg
			{...rest}
			width={px}
			height={px}
			viewBox='0 0 12 12'
			role='img'
			aria-label={title}
			// @ts-expect-error
			title={title}
			className={`rcx-status-bullet rcx-status-bullet--busy ${className} ${size === 'small' ? 'rcx-status-bullet--small' : ''}`}
			xmlns='http://www.w3.org/2000/svg'
		>
			<circle cx='6' cy='6' r='6' fill='#f5455c' />
		</svg>
	);
};

export default DoNotDisturbIcon;
