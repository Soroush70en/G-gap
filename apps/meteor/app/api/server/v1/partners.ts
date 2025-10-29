import { API } from '../api';

// API.v1.addRoute(
//     'partners.create',
//     { requireAuth: true },
//     {
// 		async get() {
// 			// check(
// 			// 	this.queryParams,
// 			// 	Match.ObjectIncluding({
// 			// 		userId: Match.Maybe(String),
// 			// 	}),
// 			// );

// 			// const { userId } = this.queryParams;

// 			// // If the caller has permission to view all teams, there's no need to filter the teams
// 			// const adminId = hasPermission(this.userId, 'view-all-teams') ? undefined : this.userId;

// 			// const teams = await Team.findBySubscribedUserIds(userId, adminId);

// 			return API.v1.success({
// 				,
// 			});
// 		},
// 	},
// )