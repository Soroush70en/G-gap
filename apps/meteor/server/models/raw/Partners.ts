import type { IPartner } from '@rocket.chat/core-typings';
import { BaseRaw } from './BaseRaw';

export class PartnersRaw extends BaseRaw<IPartner> {
    constructor(db: Db, trash?: Collection<RocketChatRecordDeleted<IPartner>>) {
		super(db, 'partners', trash);
	}
}