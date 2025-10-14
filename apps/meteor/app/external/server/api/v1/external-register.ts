// app/external/server/api/v1/external-register.ts
import { API } from '../../../../api/server';
import { verifyPartnerHMAC } from '../../lib/partnerAuth';
import { upsertUser } from '../../lib/userUpsert';
import { loadExistingKeyRecord, decryptUserKeyFromRecord, generateUserKey, saveNewPermanentKey, encryptForPartnerTransport } from '../../lib/keyStore';
import { linkSalesTeamRelations } from '../../lib/linkSalesTeam';
import { reconcileParentGroup } from '../../lib/grouping';

type RegisterItem = {
  tag: string;
  username?: string;
  email?: string;
  name?: string;
  roles?: string[];
  salesTeamId?: string;
  organizationId?: string;
  parentId?: string;
  childrenIds?: string[];
};

API.v1.addRoute('external.register', { authRequired: false }, {
  async post() {
    try {
      await verifyPartnerHMAC(this.request);

      const partnerId = (this.request as any).partner.partnerId;
      const partnerSecret = (this.request as any).partner.partnerSecret;

      const raw = this.bodyParams ?? {};
      const items: RegisterItem[] =
        Array.isArray(raw) ? raw :
        Array.isArray(raw.users) ? raw.users :
        [raw];
      const isBulk = items.length > 1;

      const results: Array<{
        index: number;
        username?: string;
        email?: string;
        userId?: string;
        key?: string;
        salesTeamId?: string;
        organizationId?: string;
        error?: string;
      }> = [];

      let index = 0;
      for (const item of items) {
        const {
          tag,
          username,
          email,
          name,
          roles,
          salesTeamId,
          organizationId,
          parentId,
          childrenIds,
        } = item ?? {};

        try {
          if (!tag) throw new Error('tag is required');

          const finalEmail =
            email && String(email).trim().length > 0
              ? String(email).trim()
              : `${username}@${tag}.ir`;

          // Upsert (+ capture previous parent)
          const { userId, prevParentSalesTeamId } = await upsertUser({
            username,
            email: finalEmail,
            name,
            roles,
            tag,
            salesTeamId: salesTeamId ? String(salesTeamId) : undefined,
            organizationId: organizationId ? String(organizationId) : undefined,
            parentSalesTeamId: parentId ? String(parentId) : undefined, // NEW
          });

          // Permanent key: reuse or create once
          const existing = await loadExistingKeyRecord(userId);
          let keyPlain: string;
          if (existing && existing.status === 'active') {
            keyPlain = decryptUserKeyFromRecord(existing);
          } else {
            keyPlain = generateUserKey();
            await saveNewPermanentKey(userId, partnerId, keyPlain);
          }

          // Best effort DM linking
          try {
            await linkSalesTeamRelations(
              userId,
              parentId ? String(parentId) : undefined,
              Array.isArray(childrenIds) ? childrenIds.map(String) : undefined,
              organizationId ? String(organizationId) : undefined,
              tag,
            );
          } catch {}

          // === NEW: reconcile groups/rooms ==========================
          try {
            // If this user is a parent (has childrenIds), reconcile their own group
            if (childrenIds?.length && salesTeamId && organizationId) {
              await reconcileParentGroup({
                tag,
                organizationId: String(organizationId),
                parentId: String(salesTeamId), // parent’s own salesTeamId
              });
            }
          
            // If this user has a parent, reconcile the parent's group
            if (parentId && organizationId) {
              await reconcileParentGroup({
                tag,
                organizationId: String(organizationId),
                parentId: String(parentId),
              });
            }
          
            // If parent changed, also reconcile the old parent's group
            if (prevParentSalesTeamId && prevParentSalesTeamId !== parentId && organizationId) {
              await reconcileParentGroup({
                tag,
                organizationId: String(organizationId),
                parentId: String(prevParentSalesTeamId),
              });
            }
          } catch (e) {
            console.error('reconcileParentGroup failed', e);
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
        salesTeamId: first.salesTeamId,
        organizationId: first.organizationId,
      });
    } catch (e: any) {
      return API.v1.failure(e?.message || 'registration failed');
    }
  },
});
