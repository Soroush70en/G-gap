import { isDirectMessageRoom } from '@rocket.chat/core-typings';
import { AutoComplete, Box, Option, OptionAvatar, OptionContent, Chip } from '@rocket.chat/fuselage';
import { useDebouncedValue, useMutableCallback } from '@rocket.chat/fuselage-hooks';
import { escapeRegExp } from '@rocket.chat/string-helpers';
import { useUser, useUserSubscriptions } from '@rocket.chat/ui-contexts';
import type { ComponentProps, ReactElement } from 'react';
import React, { memo, useMemo, useState } from 'react';

import { roomCoordinator } from '../../lib/rooms/roomCoordinator';
import RoomAvatar from '../avatar/RoomAvatar';
import UserAvatar from '../avatar/UserAvatar';
import { useEndpointData } from '../../hooks/useEndpointData';

const query = (term = ''): { selector: string } => ({ selector: JSON.stringify({ term }) });

type UserAndRoomAutoCompleteMultipleProps = Omit<ComponentProps<typeof AutoComplete>, 'value' | 'filter' | 'onChange'> & {
	onChange: (value: string, action: 'remove' | undefined) => void; // parent manages add/remove
	value: string[]; // array of keys (rids OR "user:USERNAME" tokens)
	filter?: string;
};

type RoomLabel = { kind: 'room'; name: string; avatarETag?: string; type: 'c' | 'p' | 'd' | 'l' | 'm' };
type UserLabel = { kind: 'user'; name: string; username: string; avatarETag?: string };
type AnyLabel = RoomLabel | UserLabel;

const UserAndRoomAutoCompleteMultiple = ({ onChange, ...props }: UserAndRoomAutoCompleteMultipleProps): ReactElement => {
	const me = useUser();
	const [filter, setFilter] = useState('');
	const debounced = useDebouncedValue(filter, 1000);

	// 1) Rooms you’re allowed to post in
	const rooms = useUserSubscriptions(
		useMemo(() => ({ open: { $ne: false }, lowerCaseName: new RegExp(escapeRegExp(debounced), 'i') }), [debounced]),
	).filter((room) => {
		if (!me) return false;
		if (isDirectMessageRoom(room) && (room.blocked || room.blocker)) return false;
		return !roomCoordinator.readOnly(room.rid, me);
	});

	const roomOptions = useMemo(
		() =>
			rooms.map(({ rid, fname, name, avatarETag, t }) => ({
				value: rid, // room id (DM/chan/group)
				label: { kind: 'room', name: fname || name, avatarETag, type: t as RoomLabel['type'] } as AnyLabel,
			})),
		[rooms],
	);

	// For de-duping user entries if you already have a 1:1 DM open
	const dmUsernames = useMemo(() => {
		const set = new Set<string>();
		for (const r of rooms) {
			if (r.t === 'd' && r.name) set.add(r.name.toLowerCase());
		}
		return set;
	}, [rooms]);

	// 2) Users (even if you never chatted with them)
	const { value: usersData } = useEndpointData('/v1/users.autocomplete', {
		params: useMemo(() => query(debounced), [debounced]),
	});

	const userOptions = useMemo(
		() =>
			(usersData?.items ?? [])
				.filter((u: any) => u.username && u._id !== me?._id)
				.filter((u: any) => !dmUsernames.has(String(u.username).toLowerCase())) // optional: hide ones with existing DM
				.map((u: any) => ({
					// token that we will resolve to rid on submit
					value: `user:${u.username}`,
					label: { kind: 'user', name: u.name ?? u.username, username: u.username, avatarETag: u.avatarETag } as AnyLabel,
				})),
		[usersData?.items, me?._id, dmUsernames],
	);

	const options = useMemo(() => [...roomOptions, ...userOptions], [roomOptions, userOptions]);

	const labelByKey = useMemo(() => {
		const m = new Map<string, AnyLabel>();
		for (const o of options) m.set(o.value as string, o.label as AnyLabel);
		return m;
	}, [options]);

	const onClickRemove = useMutableCallback((e) => {
		e.stopPropagation();
		e.preventDefault();
		onChange?.(e.currentTarget.value, 'remove');
	});

	return (
		<AutoComplete
			{...props}
			onChange={onChange as any}
			filter={filter}
			setFilter={setFilter}
			renderSelected={({ value: selected }): ReactElement =>
				(selected as string[])?.map((key) => {
					const label = labelByKey.get(key);
					const isUserToken = key.startsWith('user:');

					if (isUserToken) {
						const username = (label && (label as UserLabel).username) || key.slice(5);
						const displayName = (label && (label as UserLabel).name) || username;
						return (
							<Chip key={key} height='x20' value={key} onClick={onClickRemove} mie='x4'>
								<UserAvatar size='x20' username={username} />
								<Box is='span' margin='none' mis='x4'>
									{displayName}
								</Box>
							</Chip>
						);
					}

					const l = (label as RoomLabel) || ({ name: key, type: 'c', kind: 'room' } as RoomLabel);
					return (
						<Chip key={key} height='x20' value={key} onClick={onClickRemove} mie='x4'>
							<RoomAvatar size='x20' room={{ _id: key, type: l.type, ...l }} />
							<Box is='span' margin='none' mis='x4'>
								{l.name}
							</Box>
						</Chip>
					);
				})
			}
			renderItem={({ value, label, ...optProps }): ReactElement => {
				const l = label as AnyLabel;
				const isUser = l?.kind === 'user';
				return (
					<Option key={value as string} {...optProps}>
						<OptionAvatar>
							{isUser ? (
								<UserAvatar size='x20' username={(l as UserLabel).username} />
							) : (
								<RoomAvatar size='x20' room={{ _id: value as string, type: (l as RoomLabel).type, ...(l as any) }} />
							)}
						</OptionAvatar>
						<OptionContent>{l?.name}</OptionContent>
					</Option>
				);
			}}
			options={options}
		/>
	);
};

export default memo(UserAndRoomAutoCompleteMultiple);
