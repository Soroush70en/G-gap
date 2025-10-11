import type { IPartner } from '@rocket.chat/core-typings';
import type { IPartnersModel } from '@rocket.chat/model-typings';
import { BaseRaw } from './BaseRaw';
import type { Db, Collection, InsertOneResult, WithId } from 'mongodb';
import type { RocketChatRecordDeleted } from '@rocket.chat/core-typings';

export class PartnersRaw extends BaseRaw<IPartner> implements Omit<IPartnersModel, 'col'> {
	constructor(db: Db, trash?: Collection<RocketChatRecordDeleted<IPartner>>) {
		super(db, 'partners', trash);
	}

	// You must implement the method promised in the interface
	async createWithRandomId(
		name: IPartner['name'],
		partnerId: IPartner['partnerId'],
		partnerSecret: IPartner['partnerSecret'],
		allowedTags: IPartner['allowedTags'],
		status: IPartner['status'],
		createdAt: IPartner['createdAt'],
		_updatedAt?: IPartner['_updatedAt'],
	): Promise<InsertOneResult<WithId<IPartner>>> {
		const newPartner: IPartner = {
			// _id: Random.id(),
			name,
			partnerId,
			partnerSecret,
			allowedTags,
			status,
			createdAt,
			...(_updatedAt && { _updatedAt }),
		};

		return this.insertOne(newPartner);
	}
}