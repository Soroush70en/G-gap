import type { JSONSchemaType } from 'ajv';
import Ajv from 'ajv';

const ajv = new Ajv();

export type VideoConfDeclineProps = {
	callId: string;
};

const videoConfDeclinePropsSchema: JSONSchemaType<VideoConfDeclineProps> = {
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

export const isVideoConfDeclineProps = ajv.compile(videoConfDeclinePropsSchema);
