import _ from 'underscore';
import { Base } from './_Base';
import type { IPartner } from '@rocket.chat/core-typings';

export class Partners extends Base {
	constructor() {
		super('partners');
		this.tryEnsureIndex({ name: 1 }, { sparse: true, unique: true });
		this.tryEnsureIndex({ partnerId: 1 }, { sparse: true, unique: true });
		this.tryEnsureIndex({ partnerSecret: 1 }, { sparse: true, unique: true });
	}

	create(data: IPartner) {
		const partner = {
			status: 'active',
			createdAt: new Date(),
			_updatedAt: new Date(),
		};

		_.extend(partner, data);

		return this.insert(partner);
	}

	findOneByName(name: string, options = {}) {
		const query = { name: name };
		return this.findOne(query, options);
	}

    findOneByPartnerId(partnerId: string, options = {}) {
		const query = { partnerId: partnerId };
		return this.findOne(query, options);
	}
}

export default new Partners();
