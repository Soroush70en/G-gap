import type { JSONSchemaType } from 'ajv';
import Ajv from 'ajv';

const ajv = new Ajv();

export type VideoConfLeftCallJitsiProps = { callId: string; userId: string };

const videoConfLeftCallJitsiPropsSchema: JSONSchemaType<VideoConfLeftCallJitsiProps> = {
	type: 'object',
	properties: {
		callId: {
			type: 'string',
			nullable: false,
		},
		userId: {
			type: 'string',
			nullable: false,
		},
	},
	required: ['callId', 'userId'],
	additionalProperties: false,
};

export const isVideoConfLeftCallJitsiProps = ajv.compile(videoConfLeftCallJitsiPropsSchema);
