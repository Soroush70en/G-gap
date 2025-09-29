import { Mongo } from 'meteor/mongo';
import type { IPartner } from '@rocket.chat/core-typings';

class PartnersCollection extends Mongo.Collection<IPartner> {
	constructor() {
		super(null);
	}
}

/** @deprecated */
export const Partners = new PartnersCollection();
