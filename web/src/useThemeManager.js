import { useState, useEffect, useMemo, useCallback } from 'react';
import { RETRO_THEMES } from './utils.js';

export function useThemeManager() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('sim8085_theme') || 'tokyo-night' } catch { return 'tokyo-night' }
  });

  const [crtBrightness, setCrtBrightness] = useState(() => {
    try { const theme = localStorage.getItem('sim8085_theme') || 'tokyo-night'; return parseFloat(localStorage.getItem(`sim8085_crt_b_${theme}`) || '1') } catch { return 1 }
  });
  const [crtContrast, setCrtContrast] = useState(() => {
    try { const theme = localStorage.getItem('sim8085_theme') || 'tokyo-night'; return parseFloat(localStorage.getItem(`sim8085_crt_c_${theme}`) || '1') } catch { return 1 }
  });
  const [crtGlitch, setCrtGlitch] = useState(() => {
    try { const v = localStorage.getItem('sim8085_crt_glitch'); return v === 'true' ? 'flicker' : (v && v !== 'false' ? v : 'off') } catch { return 'off' }
  });
  const [crtVignette, setCrtVignette] = useState(() => {
    try { return localStorage.getItem('sim8085_crt_vignette') !== 'false' } catch { return true }
  });
  const [chaosCalm, setChaosCalm] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('sim8085_theme', theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      setCrtBrightness(parseFloat(localStorage.getItem(`sim8085_crt_b_${theme}`) || '1'));
      setCrtContrast(parseFloat(localStorage.getItem(`sim8085_crt_c_${theme}`) || '1'));
    } catch {}
  }, [theme]);

  useEffect(() => {
    const isRetro = RETRO_THEMES.includes(theme);
    if (!isRetro || crtGlitch !== 'chaos') { setChaosCalm(false); return }
    let id;
    const tick = (calm) => { id = setTimeout(() => { setChaosCalm(!calm); tick(!calm) }, calm ? 1000 : 4000) };
    setChaosCalm(false);
    tick(false);
    return () => clearTimeout(id);
  }, [theme, crtGlitch]);

  const isRetroTheme = RETRO_THEMES.includes(theme);

  const popoutCrtProps = useMemo(
    () => ({
      containerStyle: isRetroTheme ? { filter: `brightness(${crtBrightness}) contrast(${crtContrast})` } : undefined,
      containerClass: `${isRetroTheme && crtGlitch !== 'off' ? `crt-glitch-${crtGlitch}` : ''}${isRetroTheme && !crtVignette ? ' crt-no-vignette' : ''}`
    }),
    [isRetroTheme, crtBrightness, crtContrast, crtGlitch, crtVignette]
  );

  const onCrtBrightnessChange = (v) => { setCrtBrightness(v); try { localStorage.setItem(`sim8085_crt_b_${theme}`, v) } catch {} };
  const onCrtContrastChange = (v) => { setCrtContrast(v); try { localStorage.setItem(`sim8085_crt_c_${theme}`, v) } catch {} };
  const onCrtGlitchChange = () => {
    const modes = ['off','flicker','static','vsync','hsync','chroma','chaos'];
    const next = modes[(modes.indexOf(crtGlitch) + 1) % modes.length];
    setCrtGlitch(next);
    try { localStorage.setItem('sim8085_crt_glitch', next) } catch {};
  };
  const onCrtVignetteChange = (v) => { setCrtVignette(v); try { localStorage.setItem('sim8085_crt_vignette', String(v)) } catch {} };

  const toggleTheme = useCallback(() => {
    setTheme(t =>
      t === 'dark'       ? 'dim'        :
      t === 'dim'        ? 'dracula'    :
      t === 'dracula'    ? 'light'      :
      t === 'light'      ? 'amber-mono' :
      t === 'amber-mono' ? 'gray-crt'   :
      t === 'gray-crt'   ? 'green'      :
      t === 'green'      ? 'blue-crt'   :
      t === 'blue-crt'   ? 'plasma'     : 'dark'
    )
  }, []);

  return {
    theme, setTheme, toggleTheme,
    crtBrightness, onCrtBrightness: onCrtBrightnessChange,
    crtContrast, onCrtContrast: onCrtContrastChange,
    crtGlitch, onCrtGlitch: onCrtGlitchChange,
    crtVignette, onCrtVignette: onCrtVignetteChange,
    chaosCalm, isRetroTheme, popoutCrtProps,
  };
}