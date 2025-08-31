import type { IRoom, ISubscription } from '@rocket.chat/core-typings';
import { css } from '@rocket.chat/css-in-js';
import { Box } from '@rocket.chat/fuselage';
import { useResizeObserver } from '@rocket.chat/fuselage-hooks';
import { useSession, useUserPreference, useUserId, useTranslation } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React, { useMemo, useState, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { useAvatarTemplate } from '../hooks/useAvatarTemplate';
import { usePreventDefault } from '../hooks/usePreventDefault';
import { useRoomList } from '../hooks/useRoomList';
import { useShortcutOpenMenu } from '../hooks/useShortcutOpenMenu';
import { useTemplateByViewMode } from '../hooks/useTemplateByViewMode';
import RoomListRow from './RoomListRow';
import ScrollerWithCustomProps from './ScrollerWithCustomProps';

type RoomTab = 'all' | 'direct' | 'groups' | 'channels' | 'teams';

const computeItemKey = (index: number, room: ISubscription & IRoom): IRoom['_id'] | number => room._id || index;

/* ---------------- helpers ---------------- */
const getUnread = (r: ISubscription & IRoom): number => {
  const any = r as any;
  // رایج‌ترین فیلد راکت‌چت
  if (typeof any.unread === 'number') return Math.max(0, any.unread);
  // اگر فقط بولین alert داشت، یعنی unread>0 اما عدد نداریم → 1 حساب کن (یا 0 بگذار اگر عدد دقیق می‌خواهی)
  if (any.unreadAlert === true || any.alert === true) return 1;
  // در برخی تنظیمات thread-unread به‌صورت آرایه می‌آید
  if (Array.isArray(any.tunread)) return any.tunread.length | 0;
  return 0;
};
// یک دسته‌بندی «منحصر به فرد» برای هر اتاق برمی‌گرداند تا دابل کانت نشود
const exclusiveCategoryOf = (r: ISubscription & IRoom): RoomTab | null => {
  // فقط همین انواع را لحاظ کنیم؛ سایر انواع (مثل livechat و ...) کنار گذاشته شوند
  if (r.t === 'd') return 'direct';
  if (r.teamMain) return 'teams'; // گروه‌ها اولویت دارند تا توی groups/channels دوباره شمرده نشوند
  if (r.t === 'c') return 'channels';
  if (r.t === 'p') return 'groups';
  return null;
};

const filterByTabExclusive = (items: Array<ISubscription & IRoom>, tab: RoomTab) => {
  if (tab === 'all') return items.filter((r) => exclusiveCategoryOf(r) !== null);
  return items.filter((r) => exclusiveCategoryOf(r) === tab);
};

const applyQuery = (items: Array<ISubscription & IRoom>, query: string) => {
  const q = query?.trim().toLowerCase();
  if (!q) return items;
  return items.filter((room) => room.name?.toLowerCase().includes(q));
};

// const computeCountsExclusive = (items: Array<ISubscription & IRoom>, query: string) => {

//   // اول سرچ، بعد دسته‌بندی انحصاری
//   const filteredByQuery = applyQuery(items, query);
//   const base = filteredByQuery.filter((r) => exclusiveCategoryOf(r) !== null);

//   const direct = base.filter((r) => exclusiveCategoryOf(r) === 'direct').length;
//   const teams = base.filter((r) => exclusiveCategoryOf(r) === 'teams').length;
//   const channels = base.filter((r) => exclusiveCategoryOf(r) === 'channels').length;
//   const groups = base.filter((r) => exclusiveCategoryOf(r) === 'groups').length;

//   return {
//     all: base.length,
//     direct,
//     groups,
//     channels,
//     teams,
//   } as Partial<Record<RoomTab, number>>;
// };
/* ----------------------------------------- */

// این تابع قبلی را حذف/کامنت کن:
// const computeCountsExclusive = (...)

const computeUnreadCountsExclusive = (items: Array<ISubscription & IRoom>, query: string) => {
  // اول سرچ، بعد دسته‌بندی انحصاری (مانند قبل)
  const filteredByQuery = applyQuery(items, query);
  const base = filteredByQuery.filter((r) => exclusiveCategoryOf(r) !== null);

  const sum = (arr: Array<ISubscription & IRoom>, tab?: RoomTab) =>
    arr
      .filter((r) => (tab ? exclusiveCategoryOf(r) === tab : true))
      .reduce((acc, r) => acc + getUnread(r), 0);

  const all = sum(base);
  const direct = sum(base, 'direct');
  const teams = sum(base, 'teams');
  const channels = sum(base, 'channels');
  const groups = sum(base, 'groups');

  // خروجی اعدادِ unread هر تب است
  return { all, direct, groups, channels, teams } as Partial<Record<RoomTab, number>>;
};

const RoomList = (): ReactElement => {
  const t = useTranslation();
  const isAnonymous = !useUserId();
  const roomsList = useRoomList() as Array<ISubscription & IRoom>;
  const avatarTemplate = useAvatarTemplate();
  const sideBarItemTemplate = useTemplateByViewMode();
  const { ref } = useResizeObserver({ debounceDelay: 100 });
  const openedRoom = (useSession('openedRoom') as string) || '';
  const sidebarViewMode = useUserPreference<'extended' | 'medium' | 'condensed'>('sidebarViewMode') || 'extended';

  const extended = sidebarViewMode === 'extended';

  // فیلتر جاری که از Header می‌آید
  const [filterState, setFilterState] = useState<{ query: string; tab: RoomTab }>({ query: '', tab: 'all' });

  // لیست نهایی برای نمایش
  const [filteredRooms, setFilteredRooms] = useState<Array<ISubscription & IRoom>>(
    roomsList.filter((r) => exclusiveCategoryOf(r) !== null),
  );

  // کانت تب‌ها (انحصاری)
  const [counts, setCounts] = useState<Partial<Record<RoomTab, number>>>({});

  // وقتی لیست اتاق‌ها عوض شد، نمایش و کانت را رفرش کن
  useEffect(() => {
    const { query, tab } = filterState;
    const base = roomsList;
    const byTab = filterByTabExclusive(base, tab);
    const byQuery = applyQuery(byTab, query);
    setFilteredRooms(byQuery);

    const c = computeUnreadCountsExclusive(base, query);
    setCounts(c);
    window.dispatchEvent(new CustomEvent('sidebar:counts', { detail: c }));
  }, [roomsList]); // eslint-disable-line react-hooks/exhaustive-deps

  // دریافت فیلترها از Header
  useEffect(() => {
    const onFilter = (e: Event) => {
      const { query, tab } = (e as CustomEvent).detail as { query: string; tab: RoomTab };
      setFilterState({ query, tab });

      const base = roomsList;
      const byTab = filterByTabExclusive(base, tab);
      const byQuery = applyQuery(byTab, query);
      setFilteredRooms(byQuery);

      const c = computeUnreadCountsExclusive(base, query);
      setCounts(c);
      window.dispatchEvent(new CustomEvent('sidebar:counts', { detail: c }));
    };

    window.addEventListener('sidebar:filter', onFilter as EventListener);
    return () => window.removeEventListener('sidebar:filter', onFilter as EventListener);
  }, [roomsList]);

  // اگر فقط query عوض شد (بدون تغییر roomsList)، کانت/نمایش را آپدیت کن
  useEffect(() => {
    const { query, tab } = filterState;
    const base = roomsList;
    const byTab = filterByTabExclusive(base, tab);
    const byQuery = applyQuery(byTab, query);
    setFilteredRooms(byQuery);

    const c = computeUnreadCountsExclusive(base, query);
    setCounts(c);
    window.dispatchEvent(new CustomEvent('sidebar:counts', { detail: c }));
  }, [filterState.query]); // eslint-disable-line react-hooks/exhaustive-deps

  const itemData = useMemo(
    () => ({
      extended,
      t,
      SideBarItemTemplate: sideBarItemTemplate,
      AvatarTemplate: avatarTemplate,
      openedRoom,
      sidebarViewMode,
      isAnonymous,
      counts, // شمارنده‌های صحیح
    }),
    [avatarTemplate, extended, isAnonymous, openedRoom, sideBarItemTemplate, sidebarViewMode, t, counts],
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
    <Box className={[roomsListStyle, 'sidebar--custom-colors'].filter(Boolean)} aria-label={t('Channels')} role="region">
      <Box h="full" w="full" ref={ref}>
        <Virtuoso<ISubscription & IRoom>
          totalCount={filteredRooms.length}
          data={filteredRooms}
          components={{ Scroller: ScrollerWithCustomProps }}
          computeItemKey={computeItemKey}
          itemContent={(index, room): ReactElement => (
            <RoomListRow
              data={{ ...itemData, tabCounts: counts }}
              item={room}
            />
          )}
        />
      </Box>
    </Box>
  );
};

export default RoomList;
