import type { JSONSchemaType } from 'ajv';
import Ajv from 'ajv';

const ajv = new Ajv();

export type VideoConfLostProps = {
	callId: string;
};

const videoConfLostPropsSchema: JSONSchemaType<VideoConfLostProps> = {
	type: 'object',
	properties: {
		callerId: {
			type: 'string',
			nullable: false,
		}		
	},
	required: ['callerId'],
	additionalProperties: false,
};

export const isVideoConfLostProps = ajv.compile(videoConfLostPropsSchema);
