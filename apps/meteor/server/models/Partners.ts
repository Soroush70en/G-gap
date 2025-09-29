import { registerModel } from '@rocket.chat/models';

import { trashCollection } from '../database/trash';
import { db } from '../database/utils';
import { PartnersRaw } from './raw/Partners';

registerModel('IPartnersModel', new PartnersRaw(db, trashCollection));