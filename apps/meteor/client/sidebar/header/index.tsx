// apps/meteor/client/sidebar/header/Header.tsx
import { Sidebar, Box, TextInput, Icon } from '@rocket.chat/fuselage';
import { useTranslation } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React, { memo, useEffect, useRef, useState, useCallback } from 'react';

import SearchList from '../search/SearchList';

type RoomTab = 'all' | 'direct' | 'groups' | 'channels' | 'teams';

const svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="11.5" cy="11.5" r="9.5" stroke="#596C78" stroke-width="1.5"/>
  <path d="M18.5 18.5L22 22" stroke="#596C78" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const TABS: { id: RoomTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'direct', label: 'Direct_Messages' },
  { id: 'groups', label: 'Private_Groups' },
  { id: 'channels', label: 'Channels' },
  { id: 'teams', label: 'Teams' },
];

/* ---------- helpers: RTL-safe scroll (بدون هوک بیرون کامپوننت) ---------- */
type RtlScrollType = 'default' | 'negative' | 'reverse';

function detectRtlScrollTypeFor(dirIsRtl: boolean): RtlScrollType {
  // برای LTR اصلاً مهم نیست
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

  let mode: RtlScrollType;
  outer.scrollLeft = 0;
  if (outer.scrollLeft > 0) {
    mode = 'default';
  } else {
    outer.scrollLeft = 1;
    mode = outer.scrollLeft === 0 ? 'negative' : 'reverse';
  }

  document.body.removeChild(outer);
  return mode;
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
/* ------------------------------------------------------------------------ */

const HeaderWithData = (): ReactElement => {
  const t = useTranslation();

  /********* Get Direction *************/
  const [isRtl, setIsRtl] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    const compute = () => root.getAttribute('dir') === 'rtl';
    setIsRtl(compute());
    const observer = new MutationObserver(() => setIsRtl(compute()));
    observer.observe(root, { attributes: true, attributeFilter: ['dir'] });
    return () => observer.disconnect();
  }, []);

  // کش نوع اسکرول RTL بر اساس وضعیت فعلی
  const [rtlMode, setRtlMode] = useState<RtlScrollType>('default');
  useEffect(() => {
    setRtlMode(detectRtlScrollTypeFor(isRtl));
  }, [isRtl]);

  /********* Stateهای دیگر *************/
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

  // دریافت کانت‌ها از RoomList
  const [counts, setCounts] = useState<Partial<Record<RoomTab, number>>>({});
  useEffect(() => {
    const onCounts = (e: Event) => setCounts((e as CustomEvent).detail || {});
    window.addEventListener('sidebar:counts', onCounts as EventListener);
    return () =>
      window.removeEventListener('sidebar:counts', onCounts as EventListener);
  }, []);

  // ارسال query و tab به RoomList
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('sidebar:filter', { detail: { query, tab } }),
    );
  }, [query, tab]);

  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const pos = getNormalizedPos(el, isRtl, rtlMode);
    setCanLeft(pos < max - 2);
    setCanRight(pos > 2);
  }, [isRtl, rtlMode]);

  // ریست پوزیشن و آپدیت فلش‌ها هنگام mount و تغییر RTL
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      setNormalizedPos(el, 0, isRtl, rtlMode);
      updateArrows();
    });
  }, [isRtl, rtlMode, updateArrows]);

  useEffect(() => {
    const onResize = () => updateArrows();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateArrows]);

  const scrollVisual = (dir: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const step = 200;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const pos = getNormalizedPos(el, isRtl, rtlMode);
    const next = dir === 'left' ? Math.min(max, pos + step) : Math.max(0, pos - step);
    setNormalizedPos(el, next, isRtl, rtlMode);
    requestAnimationFrame(updateArrows);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  // --- تشخیص حالت تم (دارک/لایت) ---
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

  // پالت رنگ تب‌ها بر اساس تم
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
      padding: '0px 0',
      scrollBehavior: 'smooth',
      msOverflowStyle: 'none' as any,
      borderBottom: '1px solid var(--stroke-default, #343F46)',
      
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
    itemActive: { color: palette.tabActive, borderBottomColor: palette.borderBottom },
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
      marginInlineStart: 8,
    },
    arrowLeft: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: 20,
      display: 'grid',
      placeItems: 'center',
      zIndex: 0,
      background: 'none',
    },
    arrowRight: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: 0,
      width: 20,
      display: 'grid',
      placeItems: 'center',
      zIndex: 0,
      background: 'none',
    },
    arrowBtn: {
      padding: 0,
      width: 20,
      height: 20,
      borderRadius: 999,
      border: 0,
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
      fontWeight: 500,
      color: (isDark? '#FFF':'#000'),
    },
    arrowBtnDisabled: { opacity: 0.35, cursor: 'default' },
    arrowBtnEnable: { background: 'rgb(52 63 70 / 47%)' },
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
      `}</style>

      <Sidebar.TopBar.Section>
        <Box width="full" pi="x12" pb="x8">
          <TextInput
            ref={inputRef}
            style={{
              ...S.wrap,
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
          <div style={{ ...isRtl?S.arrowLeft:S.arrowRight, ...(canLeft ? S.arrowBtnEnable : {}) }}>
            <button
              className="gg-arrow-btn"
              style={{ ...S.arrowBtn, ...(canLeft ? {} : S.arrowBtnDisabled) }}
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
            onScroll={updateArrows}
          >
            {TABS.map((tb) => {
              const active = tb.id === tab;
              const count = counts[tb.id] ?? 0;
              return (
                <button
                  key={tb.id}
                  className={`gg-tab ${active ? 'is-active' : ''}`}
                  style={{ ...S.item, ...(active ? S.itemActive : S.itemNotActive) }}
                  onClick={() => setTab(tb.id)}
                  type="button"
                >
                  <span>{t(tb.label as any)}</span>
                  <span style={S.badge}>{count}</span>
                </button>
              );
            })}
          </div>

          <div style={{ ...isRtl ?S.arrowRight:S.arrowLeft, ...(canRight ? S.arrowBtnEnable : {}) }}>
            <button
              className="gg-arrow-btn"
              style={{ ...S.arrowBtn, ...(canRight ? {} : S.arrowBtnDisabled) }}
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
