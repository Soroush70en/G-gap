import { API } from '../../../../api/server';
import { verifyPartnerHMAC } from '../../lib/partnerAuth';
import { Users } from '@rocket.chat/models';
import { reconcileParentGroup } from '../../lib/grouping';

API.v1.addRoute('external.reparent', { authRequired: false }, {
  async post() {
    try {
      await verifyPartnerHMAC(this.request);
      const { tag, organizationId, salesTeamId, oldParentId, newParentId } = this.bodyParams ?? {};
      if (!tag || !organizationId || !salesTeamId || !newParentId) {
        return API.v1.failure('missing fields');
      }

      // Update the user’s parentSalesTeamId (by salesTeamId+org)
      const user = await Users.findOne(
        { 'customFields.salesTeamId': String(salesTeamId), 'customFields.organizationId': String(organizationId) },
        { projection: { _id: 1 } },
      );
      if (!user?._id) return API.v1.failure('user not found');

      await Users.updateOne({ _id: user._id }, { $set: { 'customFields.parentSalesTeamId': String(newParentId) } });

      // Reconcile new parent + old parent
      await reconcileParentGroup({ tag: String(tag), organizationId: String(organizationId), parentId: String(newParentId) });
      if (oldParentId) {
        await reconcileParentGroup({ tag: String(tag), organizationId: String(organizationId), parentId: String(oldParentId) });
      }

      return API.v1.success();
    } catch (e: any) {
      return API.v1.failure(e?.message || 'reparent failed');
    }
  },
});
