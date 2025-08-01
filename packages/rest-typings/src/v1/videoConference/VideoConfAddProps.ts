import type { JSONSchemaType } from 'ajv';
import Ajv from 'ajv';

const ajv = new Ajv();

export type VideoConfAddProps = { callId: string; currentUserId: string; usernames: string[] };

const videoConfAddPropsSchema: JSONSchemaType<VideoConfAddProps> = {
	type: 'object',
	properties: {
		callId: {
			type: 'string',
			nullable: false,
		},
		currentUserId: {
			type: 'string',
			nullable: false,
		},
		usernames: {
			type: 'array',
			items: {
				type: 'string',
			},
			nullable: false,
		},
	},
	required: ['callId', 'currentUserId', 'usernames'],
	additionalProperties: false,
};

export const isVideoConfAddProps = ajv.compile(videoConfAddPropsSchema);
