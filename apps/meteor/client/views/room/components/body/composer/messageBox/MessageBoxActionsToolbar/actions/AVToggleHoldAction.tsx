import React, { useCallback, useMemo, useRef, useState } from 'react';
import VideoMessageAction from './VideoMessageAction';
import AudioMessageAction from './AudioMessageAction';


type AVMode = 'audio' | 'video';

type Props = {
  disabled?: boolean;
  isRecording?: boolean;
  isMicrophoneDenied?: boolean;
  collapsed?: boolean;
  initialMode?: AVMode;
  longPressMs?: number;
  onModeChange?: (mode: AVMode) => void;
};

const AVToggleHoldAction: React.FC<Props> = ({
  disabled = false,
  isRecording = false,
  isMicrophoneDenied,
  collapsed = true,
  initialMode = 'audio',
  longPressMs = 1000,
  onModeChange,
}) => {
  const [mode, setMode] = useState<AVMode>(initialMode);

  const timerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const squelchClickRef = useRef(false);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next: AVMode = prev === 'audio' ? 'video' : 'audio';
      onModeChange?.(next);
      return next;
    });
  }, [onModeChange]);

  const title = useMemo(
    () =>
      mode === 'audio'
        ? 'Audio (tap to switch / hold to record)'
        : 'Video (tap to switch / hold to record)',
    [mode],
  );

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onPointerDownCapture = useCallback<React.PointerEventHandler<HTMLSpanElement>>(
    (e) => {
      if (disabled || isRecording) return;
      longPressFiredRef.current = false;
      squelchClickRef.current = false;
      timerRef.current = window.setTimeout(() => {
        longPressFiredRef.current = true; // لانگ‌پرس رخ داد، دخالت نمی‌کنیم
      }, longPressMs);
    },
    [disabled, isRecording, longPressMs],
  );

  const onPointerUpCapture = useCallback<React.PointerEventHandler<HTMLSpanElement>>(
    (e) => {
      if (disabled || isRecording) return;
      if (!longPressFiredRef.current) {
        // کلیک کوتاه => فقط سوییچ، کلیک به فرزند نرسد
        clearTimer();
        e.preventDefault();
        e.stopPropagation();
        squelchClickRef.current = true;
        toggleMode();
        return;
      }
      clearTimer(); // لانگ‌پرس: اجازه می‌دیم اکشن داخلی رکورد رو مدیریت کنه
    },
    [disabled, isRecording, toggleMode],
  );

  // به‌جای onPointerLeaveCapture از onPointerOutCapture استفاده می‌کنیم
  const onPointerOutCapture = useCallback<React.PointerEventHandler<HTMLSpanElement>>(() => {
    clearTimer();
  }, []);

  // بعضی دستگاه‌ها pointercancel می‌فرستن
  const onPointerCancel = useCallback<React.PointerEventHandler<HTMLSpanElement>>(() => {
    clearTimer();
  }, []);

  const onClickCapture = useCallback<React.MouseEventHandler<HTMLSpanElement>>((e) => {
    if (squelchClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      squelchClickRef.current = false;
    }
  }, []);
;
  return (
    <span
      title={title}
      role="button"
      aria-label={mode === 'audio' ? 'Audio toggle' : 'Video toggle'}
      onPointerDownCapture={onPointerDownCapture}
      onPointerUpCapture={onPointerUpCapture}
      onPointerOutCapture={onPointerOutCapture}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
      className="rcx-button-group__item"
      style={{ display: 'flex',alignItems:'center',justifyContent:'center',padding:'2px' }}
      data-testid="av-toggle-hold-action"
    >
      {mode === 'audio' ? (
        <AudioMessageAction
          key="audio"
          disabled={disabled || isRecording || !!isMicrophoneDenied}
          isMicrophoneDenied={isMicrophoneDenied}
        />
      ) : (
        <VideoMessageAction key="video" collapsed={collapsed} disabled={disabled || isRecording} />
      )}
    </span>
  );
};

export default AVToggleHoldAction;
