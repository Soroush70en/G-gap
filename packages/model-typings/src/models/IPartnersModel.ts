import type { InsertOneResult, WithId } from 'mongodb';
import type { IPartner } from '@rocket.chat/core-typings';

import type { IBaseModel } from './IBaseModel';

export interface IPartnersModel extends IBaseModel<IPartner> {
	createWithRandomId(
    name: IPartner['name'],
    partnerId: IPartner['partnerId'],
    partnerSecret: IPartner['partnerSecret'],
    allowedTags: IPartner['allowedTags'],
    status: IPartner['status'],
    createdAt: IPartner['createdAt'],
    _updatedAt?: IPartner['_updatedAt'],
	): Promise<InsertOneResult<WithId<IPartner>>>;
}
