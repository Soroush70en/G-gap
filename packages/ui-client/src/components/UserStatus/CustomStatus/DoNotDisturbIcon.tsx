import type { AllHTMLAttributes } from 'react';

export type StatusBulletProps = {
	status?: 'loading' | 'online' | 'busy' | 'away' | 'offline' | 'disabled' | 'doNotDisturb';
	size?: 'small' | 'large';
} & Omit<AllHTMLAttributes<SVGElement>, 'size'>;

type DoNotDisturbProps = {
	title: string;
};

const DoNotDisturbIcon = ({ title }: DoNotDisturbProps) => (
	<span title={title}>
		<svg width='0.625rem' height='0.625rem' viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg' fill='' stroke=''>
			<g id='SVGRepo_bgCarrier' stroke-width='0'></g>
			<g id='SVGRepo_tracerCarrier' stroke-linecap='round' stroke-linejoin='round'></g>
			<g id='SVGRepo_iconCarrier'>
				{' '}
				<circle cx='6' cy='6' r='6' fill='#f5455c'></circle>{' '}
			</g>
		</svg>
	</span>
);

export default DoNotDisturbIcon;
