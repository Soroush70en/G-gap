// app/external/server/api/v1/external-register.ts
import { API } from '../../../../api/server';
import { verifyPartnerHMAC } from '../../lib/partnerAuth';
import { upsertUser } from '../../lib/userUpsert';
import {
  loadExistingKeyRecord,
  decryptUserKeyFromRecord,
  generateUserKey,
  saveNewPermanentKey,
  encryptForPartnerTransport,
} from '../../lib/keyStore';
import { linkSalesTeamRelations } from '../../lib/linkSalesTeam';

type RegisterItem = {
  tag: string;
  username?: string;
  email?: string;
  name?: string;
  roles?: string[];
  salesTeamId?: string;
  organizationId?: string;   // <-- NEW
  parentId?: string;
  childrenIds?: string[];
};

API.v1.addRoute('external.register', { authRequired: false }, {
  async post() {
    try {
      await verifyPartnerHMAC(this.request);

      const partnerId = (this.request as any).partner.partnerId;
      const partnerSecret = (this.request as any).partner.partnerSecret;

      const payload = this.bodyParams ?? [];
	  const isBulk = Array.isArray(payload.users);
      const results: Array<{
        index: number;
        username?: string;
        email?: string;
        userId?: string;
        key?: string;
        salesTeamId?: string;     // <-- included in response
        organizationId?: string;  // <-- included in response
        error?: string;
      }> = [];

      let index = 0;
      for (const item of payload) {
        const {
          tag,
          username,
          email,
          name,
          roles,
          salesTeamId,
          organizationId,     // <-- NEW
          parentId,
          childrenIds,
        } = item ?? {};

        try {
          if (!tag) throw new Error('tag is required');

          const finalEmail =
            email && String(email).trim().length > 0
              ? String(email).trim()
              : `${username}@${tag}.ir`;

          // Upsert + store Sales/Org IDs
          const userId = await upsertUser({
            username,
            email: finalEmail,
            name,
            roles,
            tag,
            salesTeamId: salesTeamId ? String(salesTeamId) : undefined,
            organizationId: organizationId ? String(organizationId) : undefined, // <-- pass through
          });

          // Permanent key: reuse if exists, else create once
          const existing = await loadExistingKeyRecord(userId);
          let keyPlain: string;

          if (existing && existing.status === 'active') {
            keyPlain = decryptUserKeyFromRecord(existing);
          } else {
            keyPlain = generateUserKey();
            await saveNewPermanentKey(userId, partnerId, tag, keyPlain, 'v1');
          }

          // Best-effort DM linking by SalesTeam relations
          try {
            await linkSalesTeamRelations(
              userId,
              parentId ? String(parentId) : undefined,
              Array.isArray(childrenIds) ? childrenIds.map(String) : undefined,
              organizationId ? String(organizationId) : undefined,
            );
          } catch {
            // ignore linking errors
          }

          const keyForPartner = encryptForPartnerTransport(keyPlain, partnerSecret);

          results.push({
            index,
            username,
            email: finalEmail,
            userId,
            key: keyForPartner,
            salesTeamId: salesTeamId ? String(salesTeamId) : undefined,
            organizationId: organizationId ? String(organizationId) : undefined,
          });
        } catch (err: any) {
          results.push({
            index,
            username,
            email,
            salesTeamId: salesTeamId ? String(salesTeamId) : undefined,
            organizationId: organizationId ? String(organizationId) : undefined,
            error: err?.message || 'failed',
          });
        }

        index++;
      }

      if (isBulk) {
        return API.v1.success({ results });
      }

      const first = results[0];
      if (first.error) {
        return API.v1.failure(first.error);
      }
      return API.v1.success({
        userId: first.userId,
        key: first.key,
        salesTeamId: first.salesTeamId,         // <-- echo back
        organizationId: first.organizationId,   // <-- echo back
      });
    } catch (e: any) {
      return API.v1.failure(e?.message || 'registration failed');
    }
  },
});
