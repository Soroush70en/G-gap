import React, { useEffect, useMemo, useState } from 'react';
import { Box } from '@rocket.chat/fuselage';
import './left-rail.css';
import UserAvatarButton from '../header/UserAvatarButton';
import { useRoute, useUser, useTranslation } from '@rocket.chat/ui-contexts';

type Item = {
  id: string;
  label: string;
  renderIcon: () => React.ReactNode;
  click: () => void;
  isActive?: () => boolean;
  disabled: boolean;  // تغییر به یک مقدار بولی
};

/* =================== ICONS (currentColor) =================== */

/* گفتگو */
const ChatIcon: React.FC = () => (
  <svg viewBox="0 0 24 25" width="24" height="24" aria-hidden="true">
    <path d="M8.5 19.3334H8C4 19.3334 2 18.3334 2 13.3334V8.33337C2 4.33337 4 2.33337 8 2.33337H16C20 2.33337 22 4.33337 22 8.33337V13.3334C22 17.3334 20 19.3334 16 19.3334H15.5C15.19 19.3334 14.89 19.4834 14.7 19.7334L13.2 21.7334C12.54 22.6134 11.46 22.6134 10.8 21.7334L9.3 19.7334C9.14 19.5134 8.77 19.3334 8.5 19.3334Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 11.3334H16.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 11.3334H12.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 11.3334H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* مخاطبین */
const ContactsIcon: React.FC = () => (
  <svg viewBox="0 0 24 25" width="24" height="24" aria-hidden="true">
    <path d="M22 18.8334V5.83337C22 3.90038 20.433 2.33337 18.5 2.33337H7.5C5.567 2.33337 4 3.90038 4 5.83337V18.8334C4 20.7664 5.567 22.3334 7.5 22.3334H18.5C20.433 22.3334 22 20.7664 22 18.8334Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M5.5 7.33337H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5.5 17.3334H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M15.4795 8.80752C15.4795 10.174 14.3718 11.2817 13.0054 11.2817C11.639 11.2817 10.5312 10.174 10.5312 8.80752C10.5312 7.44109 11.639 6.33337 13.0054 6.33337C14.3718 6.33337 15.4795 7.44109 15.4795 8.80752Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M17.0476 15.6141L16.6383 14.9183C16.3049 14.3516 15.6964 14.0037 15.0389 14.0037H10.976C10.3185 14.0037 9.71007 14.3516 9.37666 14.9183L8.96733 15.6141C8.41419 16.5542 8.56406 17.6965 9.6202 17.9693C11.4994 18.4548 14.5155 18.4548 16.3947 17.9693C17.4509 17.6965 17.6007 16.5542 17.0476 15.6141Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>
);

/* جلسات (Meet) */
const MeetIcon: React.FC = () => (
  <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M21.5 12.3334V17.8334C21.5 19.7664 19.933 21.3334 18 21.3334H6.5C4.84315 21.3334 3.5 19.9902 3.5 18.3334" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M21.2331 15.0365L20.501 14.8738L21.2331 15.0365ZM2.52838 16.0206L3.21374 16.3252L2.52838 16.0206ZM7.00047 4.33337V5.08337H18.0005V4.33337V3.58337H7.00047V4.33337ZM17.1231 18.3334V17.5834H4.03141V18.3334V19.0834H17.1231V18.3334ZM3.50047 11.4399H4.25047V7.83337H3.50047H2.75047V11.4399H3.50047ZM21.5005 12.6009H20.7505C20.7505 13.3654 20.6668 14.1275 20.501 14.8738L21.2331 15.0365L21.9653 15.1992C22.1548 14.3461 22.2505 13.4748 22.2505 12.6009H21.5005ZM3.50047 11.4399H2.75047C2.75047 12.913 2.44132 14.3698 1.84302 15.716L2.52838 16.0206L3.21374 16.3252C3.89728 14.7872 4.25047 13.1229 4.25047 11.4399H3.50047ZM4.03141 18.3334V17.5834C3.38389 17.5834 2.95075 16.9169 3.21374 16.3252L2.52838 16.0206L1.84302 15.716C1.13918 17.2996 2.2984 19.0834 4.03141 19.0834V18.3334ZM17.1231 18.3334V19.0834C19.448 19.0834 21.4609 17.4687 21.9653 15.1992L21.2331 15.0365L20.501 14.8738C20.1492 16.457 18.7449 17.5834 17.1231 17.5834V18.3334ZM18.0005 4.33337V5.08337C19.5192 5.08337 20.7505 6.31459 20.7505 7.83337H21.5005H22.2505C22.2505 5.48616 20.3477 3.58337 18.0005 3.58337V4.33337ZM7.00047 4.33337V3.58337C4.65326 3.58337 2.75047 5.48616 2.75047 7.83337H3.50047H4.25047C4.25047 6.31459 5.48168 5.08337 7.00047 5.08337V4.33337ZM21.5005 7.83337H20.7505V12.6009H21.5005H22.2505V7.83337H21.5005Z" fill="currentColor"/>
    <path d="M9 3.33337V5.33337M16 3.33337V5.33337" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 9.33337H8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 13.3334H8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 9.33337H12.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 13.3334H12.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 9.33337H16.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* هوش مصنوعی */
const AiIcon: React.FC = () => (
  <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M10.282 20.4593L10.1414 21.196H10.1414L10.282 20.4593ZM4.39793 16.4923L5.0287 16.0866L4.39793 16.4923ZM9.23888 20.5305L9.49957 21.2337L9.49957 21.2337L9.23888 20.5305ZM6.00938 21.7277L6.27007 22.4309L6.00938 21.7277ZM4.07456 19.819L3.36785 19.5679L4.07456 19.819ZM4.64499 18.2136L3.93828 17.9625L4.64499 18.2136ZM21 11.7322H20.25C20.25 16.2184 16.5652 19.871 12 19.871V20.621V21.371C17.376 21.371 21.75 17.0643 21.75 11.7322H21ZM3 11.7322H3.75C3.75 7.24592 7.43484 3.59326 12 3.59326V2.84326V2.09326C6.62403 2.09326 2.25 6.39998 2.25 11.7322H3ZM12 2.84326V3.59326C16.5652 3.59326 20.25 7.24592 20.25 11.7322H21H21.75C21.75 6.39998 17.376 2.09326 12 2.09326V2.84326ZM12 20.621V19.871C11.4599 19.871 10.9326 19.8199 10.4227 19.7226L10.282 20.4593L10.1414 21.196C10.7436 21.3109 11.3651 21.371 12 21.371V20.621ZM4.39793 16.4923L5.0287 16.0866C4.2187 14.8274 3.75 13.3346 3.75 11.7322H3H2.25C2.25 13.6319 2.8067 15.405 3.76716 16.8981L4.39793 16.4923Z" fill="currentColor"/>
    <path d="M12.375 14.0831V10.2084C12.375 9.58699 11.8713 9.08325 11.2499 9.08325C10.8277 9.08325 10.4411 9.31957 10.2485 9.69527L8 14.0831" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.9375 12.4214H12.3067" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15.0664 9.08325V14.0833" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ============================================ */

export default function LeftRail() {
  const user = useUser();
  const homeRoute = useRoute('home');
  const dirRoute = useRoute('directory');
  const meetRoute = useRoute('videoconference');
  const go = (p: string) => (window as any).FlowRouter?.go?.(p);
  const t = useTranslation();
  const isMobile = () => window.matchMedia('(max-width:768px)').matches;

  // const closeMobileRail = () => {
  //   if (!isMobile()) return;
  
  //   // کلاس‌هایی که ریل رو باز نگه میدارن
  //   document.documentElement.classList.remove('rail-open', 'gg-rail-open', 'menu-open');
  
  //   // پاک کردن استایل‌های احتمالی
  //   document.body.style.overflow = '';
  //   document.body.style.filter = '';
  //   (document.body.style as any).backdropFilter = '';
  //   document.body.style.pointerEvents = '';
  
  //   const app = document.getElementById('rocket-chat');
  //   if (app) {
  //     app.style.filter = '';
  //     (app.style as any).backdropFilter = '';
  //     app.style.pointerEvents = '';
  //   }
  
  //   // حذف بک‌دراپ‌های تزریق‌شده
  //   document.querySelectorAll(
  //     [
  //       '.gg-backdrop',
  //       '.rcx-backdrop',
  //       '.rcx-sidebar-overlay',
  //       '.rcx-sidebar__overlay',
  //       '[data-overlay="sidebar"]',
  //       '.rcx-portal .rcx-backdrop',
  //       '.rcx-css-hy65ai.opened',   
  //     ].join(','),
  //   ).forEach((el) => el.parentElement?.removeChild(el));
  
  //   // ری‌فلو برای محو شدن pseudo-elementها
  //   void document.documentElement.offsetHeight;
  // };
  
  const closeMobileRail = () => {
    if (!isMobile()) return;
  
    // کلاس‌هایی که خودت اضافه می‌کنی
    document.documentElement.classList.remove('rail-open', 'gg-rail-open', 'menu-open');
  
    // پاک کردن استایل‌های تزریقی خودت
    document.body.style.overflow = '';
    document.body.style.filter = '';
    (document.body.style as any).backdropFilter = '';
    document.body.style.pointerEvents = '';
  
    const app = document.getElementById('rocket-chat');
    if (app) {
      app.style.filter = '';
      (app.style as any).backdropFilter = '';
      app.style.pointerEvents = '';
    }
  
    // فقط نودهایی که خودت ساختی رو حذف کن
    // حتماً برای آیتم‌های تزریقی خودت یک data-attr بگذار (مثلاً data-gg-injected="1")
    const safeRemove = (el: Element) => {
      try {
        // اگر remove وجود داشته باشه، امن‌ترین راه همینه
        if (typeof (el as any).remove === 'function') {
          (el as any).remove();
        } else if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      } catch {
        // نادیده بگیر؛ هدف جلوگیری از throw هست
      }
    };
  
    document.querySelectorAll('[data-gg-injected="1"], .gg-backdrop').forEach(safeRemove);
  
    // 🚫 این‌ها را حذف نکن؛ متعلق به Rocket.Chat هستند و React خودش مدیریت می‌کند:
    // '.rcx-backdrop', '.rcx-sidebar-overlay', '.rcx-sidebar__overlay', '[data-overlay="sidebar"]', '.rcx-portal .rcx-backdrop', '.rcx-css-hy65ai.opened'
  
    // اگر مجبور شدی نمایشی مخفی‌شون کنی، فقط display رو تغییر بده، حذف نکن:
    // document.querySelectorAll('.rcx-backdrop, .rcx-sidebar-overlay, ...')
    //   .forEach(el => (el as HTMLElement).style.display = 'none');
  
    // ری‌فلو برای محو شدن pseudo-elementها
    void document.documentElement.offsetHeight;
  };
  


  const items: Item[] = useMemo(
    () => [
      {
        id: 'chats',
        label: t('gg_rail_chats'), // ← کلید ترجمه
        renderIcon: () => <ChatIcon />,
        click: () => {
          homeRoute?.push?.({}) ?? go('/home');
        },
        isActive: () =>
          (location.pathname === '/' ||
            location.pathname.startsWith('/home') ||
            location.pathname.startsWith('/channel') ||
            location.pathname.startsWith('/group') ||
            location.pathname.startsWith('/direct/')) &&
          !location.pathname.startsWith('/direct/D9NtG'),
          disabled:false,
      },
      {
        id: 'contacts',
        label: t('gg_rail_contacts'),
        renderIcon: () => <ContactsIcon />,
        click: () => {
          dirRoute?.push?.({}) ?? go('/directory');
        },
        isActive: () => location.pathname.startsWith('/directory'),
        disabled:false,
      },
     /* {
        id: 'meet',
        label: t('gg_rail_meet'),
        renderIcon: () => <MeetIcon />,
        click: () => {
          //meetRoute?.push?.({}) ?? go('#');
        },
        isActive: () => location.pathname.includes('video') || location.pathname.startsWith('/meet'),
        disabled: true,
      },*/
      {
        id: 'ai',
        label: t('gg_rail_ai'),
        renderIcon: () => <AiIcon />,
        click: () => {
          go('/direct/HooshyarAI');
        },
        isActive: () => location.pathname.startsWith('/direct/PXRyQ'), // مسیر ربات هوش
        disabled:false,
      },
    ],
    [homeRoute, dirRoute, meetRoute, t],
  );

  // برای رفرش وضعیت active بعد از ناوبری
  const [, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick((x) => x + 1);
    window.addEventListener('popstate', h);
    return () => window.removeEventListener('popstate', h);
  }, []);

  // هندلر مشترک برای کلیک/راست‌کلیک
  const activate = (it: Item) => {
    it.click();
    closeMobileRail();
    // فورس رندر کوتاه تا قبل از popstate هم active بشه
    setTick((x) => x + 1);
  };

  return (
    <Box id="gg-left-rail" aria-label="Primary navigation rail">
      <div className="gg-rail-top">
        <div className="gg-rail-user">
          <UserAvatarButton />
        </div>
      </div>

      <nav className="gg-rail-nav">
      {items.map((it) => {
  const active = it.isActive?.() ?? false;
  const disabled = it.disabled; // بررسی وضعیت غیرفعال بودن دکمه
  return (
    <button
      key={it.id}
      className={`gg-rail-btn${active ? ' active' : ''}${disabled ? ' disabled' : ''}`} // اضافه کردن کلاس disabled
      title={it.label}
      type="button"
      onClick={!disabled ? () => activate(it) : undefined} // جلوگیری از کلیک
      onContextMenu={(e) => {
        // راست‌کلیک/لانگ‌پرس → منو بسته شود و آیتم فعال بماند
        if (!disabled) {
          e.preventDefault();
          e.stopPropagation();
          activate(it);
        }
        return false;
      }}
      disabled={disabled} // غیرفعال کردن دکمه از طریق خاصیت disabled
    >
      <span className="gg-rail-icon" aria-hidden="true">
        {it.renderIcon()}
      </span>
      <span className="gg-rail-label">{it.label}</span>
      {active && <span className="gg-active-indicator" />}
    </button>
  );
})}

      </nav>

      <div className="gg-rail-bottom" />
    </Box>
  );
}
