// apps/meteor/client/sidebar/header/Header.tsx
import { Sidebar, Box, TextInput, Icon } from '@rocket.chat/fuselage';
import { useTranslation } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React, {
  memo,
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import '../rail/left-rail.css';
import SearchList from '../search/SearchList';

type RoomTab = 'all' | 'direct' | 'channels' | 'teams' | 'favorites';

const svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="11.5" cy="11.5" r="9.5" stroke="#596C78" stroke-width="1.5"/>
  <path d="M18.5 18.5L22 22" stroke="#596C78" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const TABS: { id: RoomTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'direct', label: 'Direct_Messages' },
  { id: 'channels', label: 'Channels' },
  { id: 'teams', label: 'Teams' },
  { id: 'favorites', label: 'Favorites' },
];

/* ---------- RTL-safe scroll helpers ---------- */
type RtlScrollType = 'default' | 'negative' | 'reverse';

function detectRtlScrollTypeFor(dirIsRtl: boolean): RtlScrollType {
  if (!dirIsRtl) return 'default';

  const outer = document.createElement('div');
  outer.style.width = '100px';
  outer.style.height = '50px';
  outer.style.overflow = 'scroll';
  outer.style.direction = 'rtl';

  const inner = document.createElement('div');
  inner.style.width = '200px';
  inner.style.height = '1px';
  outer.appendChild(inner);

  document.body.appendChild(outer);

  try {
    let mode: RtlScrollType;
    outer.scrollLeft = 0;
    if (outer.scrollLeft > 0) {
      mode = 'default';
    } else {
      outer.scrollLeft = 1;
      mode = outer.scrollLeft === 0 ? 'negative' : 'reverse';
    }
    return mode;
  } finally {
    if ((outer as any).remove) (outer as any).remove();
    else if (outer.parentNode) {
      try {
        outer.parentNode.removeChild(outer);
      } catch {}
    }
  }
}

function getNormalizedPos(el: HTMLDivElement, rtl: boolean, rtlMode: RtlScrollType) {
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  if (!rtl) return Math.max(0, Math.min(max, el.scrollLeft));
  if (rtlMode === 'negative') return -el.scrollLeft;
  if (rtlMode === 'reverse') return max - el.scrollLeft;
  return el.scrollLeft;
}

function setNormalizedPos(el: HTMLDivElement, pos: number, rtl: boolean, rtlMode: RtlScrollType) {
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  const p = Math.max(0, Math.min(max, pos));
  if (!rtl) {
    el.scrollLeft = p;
    return;
  }
  if (rtlMode === 'negative') {
    el.scrollLeft = -p;
    return;
  }
  if (rtlMode === 'reverse') {
    el.scrollLeft = max - p;
    return;
  }
  el.scrollLeft = p;
}

/* ---------- Component ---------- */
const HeaderWithData = (): ReactElement => {
  const t = useTranslation();

  /* Direction (LTR/RTL) */
  const [isRtl, setIsRtl] = useState<boolean>(false);
  useEffect(() => {
    const root = document.documentElement;
    const compute = () => root.getAttribute('dir') === 'rtl';
    setIsRtl(compute());
    const observer = new MutationObserver(() => setIsRtl(compute()));
    observer.observe(root, { attributes: true, attributeFilter: ['dir'] });
    return () => observer.disconnect();
  }, []);

  const [rtlMode, setRtlMode] = useState<RtlScrollType>('default');
  useEffect(() => {
    setRtlMode(detectRtlScrollTypeFor(isRtl));
  }, [isRtl]);

  /* Search */
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<RoomTab>('all');

  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e: MouseEvent) => {
      const wrap = searchWrapRef.current;
      if (wrap && !wrap.contains(e.target as Node)) closeSearch();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch();
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [searchOpen, closeSearch]);

  useEffect(() => {
    if (!searchOpen && query.trim().length > 0) setSearchOpen(true);
  }, [query, searchOpen]);

  /* Unread counts (normalize to just unread) */
  const [unreadCounts, setUnreadCounts] = useState<Partial<Record<RoomTab, number>>>({});
  useEffect(() => {
    const normalizeUnread = (v: any): number => {
      if (typeof v === 'number') return Math.max(0, v | 0);
      if (v && typeof v === 'object') {
        if (typeof v.unread === 'number') return Math.max(0, v.unread | 0);
        if (typeof v.unreadCount === 'number') return Math.max(0, v.unreadCount | 0);
        return 0;
      }
      return 0;
    };

    const onCounts = (e: Event) => {
      const detail: any = (e as CustomEvent).detail || {};
      const next: Partial<Record<RoomTab, number>> = {};
      for (const tb of TABS) {
        next[tb.id] = normalizeUnread(detail[tb.id]);
      }
      setUnreadCounts(next);
    };

    window.addEventListener('sidebar:counts', onCounts as EventListener);
    return () => window.removeEventListener('sidebar:counts', onCounts as EventListener);
  }, []);

  /* propagate filter to RoomList */
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebar:filter', { detail: { query, tab } }));
  }, [query, tab]);

  /* Tabs track & arrows */
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // نگاشت تب -> ref برای scrollIntoView
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const setTabRef = (id: string) => (el: HTMLButtonElement | null) => {
    tabRefs.current[id] = el;
  };

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const EPS = 2; // تحمل خطای پیکسلی

  const computeArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const pos = getNormalizedPos(el, isRtl, rtlMode);
    // pos: 0 => ابتدای لیست، max => انتهای لیست
    // canLeft: بتوانیم به سمت "جلو" برویم (pos افزایش یابد)
    setCanLeft(pos < max - EPS);
    // canRight: بتوانیم به سمت "عقب" برویم (pos کاهش یابد)
    setCanRight(pos > EPS);
  }, [isRtl, rtlMode]);

  // دی‌بونس آپدیت‌ها در راف
  const rafId = useRef<number | null>(null);
  const requestUpdateArrows = useCallback(() => {
    if (rafId.current != null) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      computeArrows();
    });
  }, [computeArrows]);

  // محاسبه‌ی اولیه قبل از پینت
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setNormalizedPos(el, 0, isRtl, rtlMode);
  }, [isRtl, rtlMode]);

  useEffect(() => {
    // پس از لود فونت‌ها (اگر موجود بود) محاسبه کن
    if ((document as any).fonts?.ready) {
      (document as any).fonts.ready.then(() => requestUpdateArrows());
    }
  }, [requestUpdateArrows]);

  // وقتی تب عوض شد، مطمئن شو کامل در دید است
  useEffect(() => {
    const el = tabRefs.current[tab];
    if (!el) return;
    try {
      el.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    } catch {
      // fallback: هیچ
    }
    requestUpdateArrows();
  }, [tab, requestUpdateArrows]);

  // وقتی شمارش‌ها (عرض تب‌ها) تغییر می‌کنند
  useEffect(() => {
    requestUpdateArrows();
  }, [unreadCounts, requestUpdateArrows]);

  // onScroll + onResize + ResizeObserver
  useEffect(() => {
    const onScroll = () => requestUpdateArrows();
    const el = trackRef.current;
    if (el) el.addEventListener('scroll', onScroll, { passive: true });

    const onWinResize = () => requestUpdateArrows();
    window.addEventListener('resize', onWinResize);

    let ro: ResizeObserver | undefined;
    if ('ResizeObserver' in window && el) {
      ro = new ResizeObserver(() => requestUpdateArrows());
      ro.observe(el);
      // همچنین محتویات داخل ترک را هم اگر لازم دیدی رصد کن:
      Array.from(el.children).forEach((c) => ro!.observe(c as Element));
    }

    // یک بار هم بعد از mount محاسبه کن (دو راف برای اطمینان از layout پایدار)
    requestAnimationFrame(() => requestAnimationFrame(requestUpdateArrows));

    return () => {
      if (el) el.removeEventListener('scroll', onScroll as any);
      window.removeEventListener('resize', onWinResize);
      ro?.disconnect();
    };
  }, [requestUpdateArrows]);

  const scrollVisual = (dir: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const step = 220; // کمی بزرگ‌تر تا حداقل یک تب کامل جابه‌جا شود
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const pos = getNormalizedPos(el, isRtl, rtlMode);
    const next = dir === 'left' ? Math.min(max, pos + step) : Math.max(0, pos - step);
    setNormalizedPos(el, next, isRtl, rtlMode);
    requestUpdateArrows();
  };

  /* Theme (dark/light) */
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const computeIsDark = () => {
      const attr =
        (root.getAttribute('data-theme') ||
          root.getAttribute('data-color-scheme') ||
          '').toLowerCase();
      if (attr) return attr.includes('dark');

      const cls = root.className.toLowerCase();
      if (/\brcx-theme--dark\b|\btheme-?dark\b|\bdark\b/.test(cls)) return true;
      if (/\brcx-theme--light\b|\btheme-?light\b|\blight\b/.test(cls)) return false;

      const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
      return !!mq?.matches;
    };

    setIsDark(computeIsDark());

    const mo = new MutationObserver(() => setIsDark(computeIsDark()));
    mo.observe(root, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-scheme'],
    });

    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onMq = () => setIsDark(computeIsDark());
    mq?.addEventListener?.('change', onMq);

    return () => {
      mo.disconnect();
      mq?.removeEventListener?.('change', onMq);
    };
  }, []);

  const palette = isDark
    ? { tab: '#8D9FAA', tabActive: '#FFFFFF', borderBottom: '#50ADE7' }
    : { tab: '#596C78', tabActive: '#161B1D', borderBottom: '#2096E0' };

  const S: Record<string, React.CSSProperties> = {
    wrap: { position: 'relative', width: '100%' },
    track: {
      direction: (isRtl ? 'rtl' : 'ltr') as any,
      display: 'flex',
      gap: 16,
      overflowX: 'auto',
      // فضای امن برای اسکرول‌بار تا پرش نداشته باشیم:
      scrollbarGutter: 'stable both-edges' as any,
      // پدینگ برای اینکه تب‌ها زیر فلش‌ها نیمه پنهان نشوند:
      paddingInlineStart: 24,
      paddingInlineEnd: 24,
      paddingTop: 0,
      paddingBottom: 0,
      scrollBehavior: 'smooth',
      msOverflowStyle: 'none' as any,
      borderBottom: '1px solid var(--stroke-default, #343F46)',
      // جلوگیری از overscroll در بعضی مرورگرها
      overscrollBehavior: 'contain',
    },
    item: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 14px',
      borderRadius: 0,
      fontSize: 12,
      color: palette.tab,
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      background: 'transparent',
      borderBottomWidth: 1,
      borderBottomStyle: 'solid',
      borderBottomColor: 'transparent',
      transition: 'background .12s, color .12s, border-color .12s',
    },
    itemActive: { borderBottomColor: palette.borderBottom, color: palette.tabActive },
    itemNotActive: { borderBottomColor: 'transparent' },
    badge: {
      minWidth: 22,
      height: 22,
      padding: '0 6px',
      borderRadius: 999,
      fontSize: 12,
      lineHeight: '22px',
      textAlign: 'center',
      color: '#fff',
      background: '#2f7dff',
      marginInlineStart: 0,
      display: 'inline-block',
    },
    arrowLeft: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
     
      display: 'grid',
      placeItems: 'center',
      zIndex: 1,
      background: 'none',
      pointerEvents: 'none', // کانتینر کلیک‌پذیر نباشد
    },
    arrowRight: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: 0,
      
      display: 'grid',
      placeItems: 'center',
      zIndex: 1,
      background: 'none',
      pointerEvents: 'none',
    },
    arrowBtn: {
      padding: 0,
      width: 20,
      height: 39.6,
      borderRadius: 0,
      border: 0,
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
      fontWeight: 500,
      color: '#FFF',
      pointerEvents: 'auto', // خود دکمه کلیک‌پذیر باشد
    },
    arrowBtnDisabled: { opacity: 0.35, cursor: 'default' },
    arrowBtnEnable: { background: '#343f46d9' },
  };

  return (
    <>
      <style>{`
        /* Fallback (فرض لایت) */
        .gg-tab { color: #596C78; }
        .gg-tab.is-active { color: #161B1D; border-bottom-color: #50ADE7 !important; }

        /* --- حالت دارک: چند امضای رایج تم --- */
        :root[data-theme="dark"] .gg-tab,
        :root[data-color-scheme="dark"] .gg-tab,
        html.rcx-theme--dark .gg-tab,
        html.theme-dark .gg-tab,
        html.dark .gg-tab,
        body.dark .gg-tab {
          color: #8D9FAA;
        }
        :root[data-theme="dark"] .gg-tab.is-active,
        :root[data-color-scheme="dark"] .gg-tab.is-active,
        html.rcx-theme--dark .gg-tab.is-active,
        html.theme-dark .gg-tab.is-active,
        html.dark .gg-tab.is-active,
        body.dark .gg-tab.is-active {
          color: #FFFFFF;
          border-bottom-color: #50ADE7;
        }

        /* --- حالت لایت صریح --- */
        :root[data-theme="light"] .gg-tab,
        :root[data-color-scheme="light"] .gg-tab,
        html.rcx-theme--light .gg-tab,
        html.theme-light .gg-tab,
        html.light .gg-tab,
        body.light .gg-tab {
          color: #596C78;
        }
        :root[data-theme="light"] .gg-tab.is-active,
        :root[data-color-scheme="light"] .gg-tab.is-active,
        html.rcx-theme--light .gg-tab.is-active,
        html.theme-light .gg-tab.is-active,
        html.light .gg-tab.is-active,
        body.light .gg-tab.is-active {
          color: #161B1D;
          border-bottom-color: #50ADE7;
        }

        /* جلوگیری از انتخاب متن هنگام درگ اسکرول روی تب‌ها */
        .gg-tabs-track, .gg-tabs-track * { user-select: none; -webkit-user-select: none; }
      `}</style>

      <Sidebar.TopBar.Section>
        <Box width="full" pi="x12" pb="x8">
          <TextInput
            ref={inputRef}
            className="gg-search-input"
            style={{
              position: 'relative',
              width: '100%',
              backgroundImage: `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}')`,
              backgroundPosition: 'right 10px center',
              backgroundRepeat: 'no-repeat',
              paddingRight: '40px',
            }}
            placeholder={t('Search' as any)}
            value={query}
            onChange={(e: any) => setQuery(e.currentTarget.value)}
            aria-label={t('Search' as any)}
            onFocus={openSearch}
            onClick={openSearch}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter') openSearch();
            }}
          />
        </Box>
      </Sidebar.TopBar.Section>

      <Sidebar.TopBar.Section>
        <div style={S.wrap}>
          <div style={{ ...(isRtl ? S.arrowLeft : S.arrowRight) }}>
            <button
              className={`gg-arrow-btn ${canLeft ? 'is-enabled' : ''}`}
              style={{ ...S.arrowBtn, ...(canLeft ? S.arrowBtnEnable : S.arrowBtnDisabled) }}
              onClick={() => scrollVisual('left')}
              disabled={!canLeft}
              aria-label="Left"
            >
              <Icon name="chevron-left" size="x16" />
            </button>
          </div>

          <div
            ref={trackRef}
            style={S.track}
            className="gg-tabs-track"
            // onScroll را با دی‌بونس راف وصل کردیم
            onScroll={requestUpdateArrows}
          >
            {TABS.map((tb) => {
              const active = tb.id === tab;
              const unread = unreadCounts[tb.id] ?? 0;
              return (
                <button
                  key={tb.id}
                  ref={setTabRef(tb.id)}
                  className={`gg-tab ${active ? 'is-active' : ''}`}
                  style={{ ...S.item, ...(active ? S.itemActive : S.itemNotActive) }}
                  onClick={() => setTab(tb.id)}
                  type="button"
                  aria-label={`${t(tb.label as any)}${unread > 0 ? ` (${unread} ${t('Unread' as any)})` : ''}`}
                >
                  <span>{t(tb.label as any)}</span>
                  {unread > 0 && <span className="gg-badge" style={S.badge}>{unread}</span>}
                </button>
              );
            })}
          </div>

          <div style={{ ...(isRtl ? S.arrowRight : S.arrowLeft) }}>
            <button
              className={`gg-arrow-btn ${canRight ? 'is-enabled' : ''}`}
              style={{ ...S.arrowBtn, ...(canRight ? S.arrowBtnEnable : S.arrowBtnDisabled) }}
              onClick={() => scrollVisual('right')}
              disabled={!canRight}
              aria-label="Right"
            >
              <Icon name="chevron-right" size="x16" />
            </button>
          </div>
        </div>
      </Sidebar.TopBar.Section>

      {searchOpen && (
        <div ref={searchWrapRef}>
          <SearchList onClose={closeSearch} />
        </div>
      )}
    </>
  );
};

export default memo(HeaderWithData);
