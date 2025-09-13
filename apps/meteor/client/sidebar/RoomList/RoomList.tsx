import type { IRoom, ISubscription } from '@rocket.chat/core-typings';
import { css } from '@rocket.chat/css-in-js';
import { Box } from '@rocket.chat/fuselage';
import { useResizeObserver } from '@rocket.chat/fuselage-hooks';
import { useSession, useUserPreference, useUserId, useTranslation } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { useAvatarTemplate } from '../hooks/useAvatarTemplate';
import { usePreventDefault } from '../hooks/usePreventDefault';
import { useRoomList } from '../hooks/useRoomList';
import { useShortcutOpenMenu } from '../hooks/useShortcutOpenMenu';
import { useTemplateByViewMode } from '../hooks/useTemplateByViewMode';
import RoomListRow from './RoomListRow';
import ScrollerWithCustomProps from './ScrollerWithCustomProps';

// هم‌راستا با Header: تب‌ها شامل favorites هم هستند
type RoomTab = 'all' | 'direct' | 'channels' | 'teams' | 'favorites';

const computeItemKey = (index: number, room: ISubscription & IRoom): IRoom['_id'] | number =>
  room._id || index;

/* ---------------- helpers ---------------- */

// جمع‌کردن unread (در صورت نیاز thread-unread را هم اضافه کن)
const getUnread = (r: ISubscription & IRoom): number => {
  const any = r as any;
  const a = typeof any.unread === 'number' ? Math.max(0, any.unread) : 0;
  const b = Array.isArray(any.tunread) ? any.tunread.length : 0;
  if (a > 0) return a;
  if (any.unreadAlert === true || any.alert === true) return 1;
  return a + b;
};

// دسته‌بندی انحصاری هر روم (برای جلوگیری از شمارش/نمایش دوباره)
const exclusiveCategoryOf = (r: ISubscription & IRoom): RoomTab | null => {
  if (r.t === 'd') return 'direct';
  if ((r as any).teamMain) return 'teams';
  if (r.t === 'c' || r.t === 'p') return 'channels'; // ← عمومی + خصوصی
  return null; // سایر انواع (مثلاً livechat) را نشان نده
};

const isFavorite = (r: ISubscription & IRoom) => (r as any).f === true;

// فیلتر اصلی برحسب تب
const filterByTab = (items: Array<ISubscription & IRoom>, tab: RoomTab) => {
  // ابتدا فقط روم‌های مجاز (direct/channels/teams) را نگه داریم
  const allowed = items.filter((r) => exclusiveCategoryOf(r) !== null);
  if (tab === 'all') return allowed;
  if (tab === 'favorites') return allowed.filter((r) => isFavorite(r));
  // سایر تب‌ها: بر اساس دسته‌بندی انحصاری
  return allowed.filter((r) => exclusiveCategoryOf(r) === tab);
};

// جست‌وجو روی name/fname (برای DMها fname مهم است)
const applyQuery = (items: Array<ISubscription & IRoom>, query: string) => {
  const q = query?.trim().toLowerCase();
  if (!q) return items;
  return items.filter((r) => {
    const n1 = r.name?.toLowerCase() || '';
    const n2 = (r as any).fname?.toLowerCase() || '';
    return n1.includes(q) || n2.includes(q);
  });
};

// محاسبه‌ی مجموع unread هر تب (بعد از اعمال query)
const computeUnreadCounts = (items: Array<ISubscription & IRoom>, query: string) => {
  const filteredByQuery = applyQuery(items, query);
  const base = filteredByQuery.filter((r) => exclusiveCategoryOf(r) !== null);

  const sumBy = (predicate: (r: ISubscription & IRoom) => boolean) =>
    base.filter(predicate).reduce((acc, r) => acc + getUnread(r), 0);

  const all = sumBy(() => true);
  const direct = sumBy((r) => exclusiveCategoryOf(r) === 'direct');
  const teams = sumBy((r) => exclusiveCategoryOf(r) === 'teams');
  const channels = sumBy((r) => exclusiveCategoryOf(r) === 'channels');
  const favorites = sumBy((r) => isFavorite(r));

  return { all, direct, channels, teams, favorites } as Partial<Record<RoomTab, number>>;
};

const shallowEqualCounts = (
  a: Partial<Record<RoomTab, number>>,
  b: Partial<Record<RoomTab, number>>,
) =>
  a.all === b.all &&
  a.direct === b.direct &&
  a.channels === b.channels &&
  a.teams === b.teams &&
  a.favorites === b.favorites;

/* ----------------------------------------- */

const RoomList = (): ReactElement => {
  const t = useTranslation();
  const isAnonymous = !useUserId();
  const roomsList = useRoomList() as Array<ISubscription & IRoom>;
  const avatarTemplate = useAvatarTemplate();
  const sideBarItemTemplate = useTemplateByViewMode();
  const { ref } = useResizeObserver({ debounceDelay: 100 });
  const openedRoom = (useSession('openedRoom') as string) || '';
  const sidebarViewMode =
    useUserPreference<'extended' | 'medium' | 'condensed'>('sidebarViewMode') || 'extended';

  const extended = sidebarViewMode === 'extended';

  // فیلتر جاری که از Header می‌آید
  const [filterState, setFilterState] = useState<{ query: string; tab: RoomTab }>({
    query: '',
    tab: 'all',
  });

  // لیست نهایی برای نمایش
  const [filteredRooms, setFilteredRooms] = useState<Array<ISubscription & IRoom>>(
    roomsList.filter((r) => exclusiveCategoryOf(r) !== null),
  );

  // شمارنده‌های هر تب
  const [counts, setCounts] = useState<Partial<Record<RoomTab, number>>>({});

  // یک تابع واحد برای محاسبه و اعمال تغییرات
  const recalc = useCallback(
    (base = roomsList, f = filterState) => {
      const byTab = filterByTab(base, f.tab);
      const byQuery = applyQuery(byTab, f.query);
      setFilteredRooms(byQuery);

      const c = computeUnreadCounts(base, f.query);
      setCounts((prev) => {
        if (!shallowEqualCounts(prev, c)) {
          window.dispatchEvent(new CustomEvent('sidebar:counts', { detail: c }));
          return c;
        }
        return prev;
      });
    },
    [roomsList, filterState],
  );

  // تغییر لیست روم‌ها
  useEffect(() => {
    recalc();
  }, [roomsList, recalc]);

  // دریافت فیلترها از Header
  useEffect(() => {
    const onFilter = (e: Event) => {
      const { query, tab } = (e as CustomEvent).detail as { query: string; tab: RoomTab };
      setFilterState({ query, tab });
    };
    window.addEventListener('sidebar:filter', onFilter as EventListener);
    return () => window.removeEventListener('sidebar:filter', onFilter as EventListener);
  }, []);

  // اعمال تغییرات وقتی فیلتر عوض شد
  useEffect(() => {
    recalc();
  }, [filterState.query, filterState.tab, recalc]);

  const itemData = useMemo(
    () => ({
      extended,
      t,
      SideBarItemTemplate: sideBarItemTemplate,
      AvatarTemplate: avatarTemplate,
      openedRoom,
      sidebarViewMode,
      isAnonymous,
      counts,
    }),
    [
      avatarTemplate,
      extended,
      isAnonymous,
      openedRoom,
      sideBarItemTemplate,
      sidebarViewMode,
      t,
      counts,
    ],
  );

  usePreventDefault(ref);
  useShortcutOpenMenu(ref);

  const roomsListStyle = css`
    position: relative;
    display: flex;
    overflow-x: hidden;
    overflow-y: hidden;
    flex: 1 1 auto;
    height: 100%;

    &--embedded {
      margin-top: 2rem;
    }
  `;

  return (
    <Box
      className={[roomsListStyle, 'sidebar--custom-colors'].filter(Boolean)}
      aria-label={t('Channels')}
      role="region"
    >
      <Box h="full" w="full" ref={ref}>
        <Virtuoso<ISubscription & IRoom>
          totalCount={filteredRooms.length}
          data={filteredRooms}
          components={{ Scroller: ScrollerWithCustomProps }}
          computeItemKey={computeItemKey}
          itemContent={(index, room): ReactElement => (
            <RoomListRow data={{ ...itemData, tabCounts: counts }} item={room} />
          )}
        />
      </Box>
    </Box>
  );
};

export default RoomList;
