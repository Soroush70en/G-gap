import { Team } from '@rocket.chat/core-services';
import type { IMessage, ITeamMember } from '@rocket.chat/core-typings';

import { MentionQueries } from '../../../../app/mentions/server/server';
import { callbacks } from '../../../../lib/callbacks';
import { Spotlight } from '../../../../server/lib/spotlight';
import { overwriteClassOnLicense } from '../../license/server/license';
import { MentionQueriesEnterprise } from './EEMentionQueries';
import { SpotlightEnterprise } from './EESpotlight';

interface IExtraDataForNotification {
	userMentions: any[];
	otherMentions: any[];
	message: IMessage;
}

//onLicense('teams-mention', () => {
	// Override spotlight with EE version
	overwriteClassOnLicense('teams-mention', Spotlight, SpotlightEnterprise);
	overwriteClassOnLicense('teams-mention', MentionQueries, MentionQueriesEnterprise);

	callbacks.add('beforeGetMentions', (mentionIds: string[], extra?: IExtraDataForNotification) => {
		const { otherMentions } = extra ?? {};

		const teamIds = otherMentions?.filter(({ type }) => type === 'team').map(({ _id }) => _id);

		if (!teamIds?.length) {
			return mentionIds;
		}

		const members: ITeamMember[] = Promise.await(Team.getMembersByTeamIds(teamIds, { projection: { userId: 1 } }));
		mentionIds.push(
			...new Set(members.map(({ userId }: { userId: string }) => userId).filter((userId: string) => !mentionIds.includes(userId))),
		);

		return mentionIds;
	});
//});
