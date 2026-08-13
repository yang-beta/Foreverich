/* =============================================================
 * js/config.js
 * 全站共用設定：色票讀取與共用 helper
 * -------------------------------------------------------------
 * 色票本體只放在 css/style.css :root。
 * Canvas / SVG / JS 請統一使用 coralRgba() / coralHex()。
 * ============================================================= */

(() => {
  "use strict";

  const rootStyle = getComputedStyle(document.documentElement);

  function readRgbVariable(variableName) {
    return rootStyle
      .getPropertyValue(variableName)
      .trim()
      .split(",")
      .map(value => Number(value.trim()));
  }

  function readHexVariable(variableName) {
    return rootStyle.getPropertyValue(variableName).trim();
  }

  const SITE_PALETTE = Object.freeze({
    main: Object.freeze({
      rgb: readRgbVariable("--coral-main-rgb"),
      hex: readHexVariable("--coral-main")
    }),
    light: Object.freeze({
      rgb: readRgbVariable("--coral-light-rgb"),
      hex: readHexVariable("--coral-light")
    }),
    glow: Object.freeze({
      rgb: readRgbVariable("--coral-glow-rgb"),
      hex: readHexVariable("--coral-glow")
    }),
    deep: Object.freeze({
      rgb: readRgbVariable("--coral-deep-rgb"),
      hex: readHexVariable("--coral-deep")
    })
  });

  window.SITE_PALETTE = SITE_PALETTE;

  window.coralRgba = function coralRgba(level = "main", alpha = 1) {
    const color = SITE_PALETTE[level] || SITE_PALETTE.main;
    return `rgba(${color.rgb[0]}, ${color.rgb[1]}, ${color.rgb[2]}, ${alpha})`;
  };

  window.coralHex = function coralHex(level = "main") {
    return (SITE_PALETTE[level] || SITE_PALETTE.main).hex;
  };
})();

