/* =============================================================
 * MOBILE / TABLET RWD PATCH V5
 * -------------------------------------------------------------
 * main.js 現在直接處理 P6 的「禁止全站 swipe 換頁」。
 *
 * 本檔只負責：
 * 1. P4 橫向 Carousel + 左右箭頭
 * 2. P4 Carousel 改變尺寸後重新觸發 Canvas resize
 * 3. P6 鍵盤開啟時把正在輸入的欄位捲到可見位置
 *
 * 不再攔截 P6 touchend / wheel，避免兩套 navigation guard 打架。
 * ============================================================= */

(() => {
  "use strict";

  /* -----------------------------------------------------------
     P4 Canvas resize helper
     ----------------------------------------------------------- */
  let p4ResizeRefreshTimer = null;

  function refreshP4CanvasSizes() {
    if (p4ResizeRefreshTimer !== null) {
      clearTimeout(
        p4ResizeRefreshTimer
      );
    }

    p4ResizeRefreshTimer =
      window.setTimeout(() => {
        window.dispatchEvent(
          new Event("resize")
        );

        p4ResizeRefreshTimer = null;
      }, 60);
  }

  /* -----------------------------------------------------------
     P4 carousel
     ----------------------------------------------------------- */
  function initP4Carousel() {
    const cards =
      document.getElementById(
        "p4Cards"
      );

    if (
      !cards ||
      cards.closest(".p4-carousel")
    ) {
      return;
    }

    const carousel =
      document.createElement("div");

    carousel.className =
      "p4-carousel";

    const prev =
      document.createElement("button");

    prev.type = "button";
    prev.className =
      "p4-carousel-nav p4-carousel-prev";
    prev.setAttribute(
      "aria-label",
      "查看前一個感官體驗"
    );
    prev.textContent = "‹";

    const next =
      document.createElement("button");

    next.type = "button";
    next.className =
      "p4-carousel-nav p4-carousel-next";
    next.setAttribute(
      "aria-label",
      "查看下一個感官體驗"
    );
    next.textContent = "›";

    cards.parentNode.insertBefore(
      carousel,
      cards
    );

    carousel.append(
      prev,
      cards,
      next
    );

    function cardStep() {
      const first =
        cards.querySelector(
          ".p4-card-item"
        );

      if (!first) {
        return (
          cards.clientWidth * 0.82
        );
      }

      const gap =
        parseFloat(
          getComputedStyle(cards).gap
        ) || 0;

      return (
        first
          .getBoundingClientRect()
          .width +
        gap
      );
    }

    function updateNav() {
      const overflow =
        cards.scrollWidth >
        cards.clientWidth + 4;

      prev.hidden = !overflow;
      next.hidden = !overflow;

      if (!overflow) return;

      prev.disabled =
        cards.scrollLeft <= 3;

      next.disabled =
        cards.scrollLeft +
        cards.clientWidth >=
        cards.scrollWidth - 3;
    }

    prev.addEventListener(
      "click",
      () => {
        cards.scrollBy({
          left: -cardStep(),
          behavior: "smooth"
        });
      }
    );

    next.addEventListener(
      "click",
      () => {
        cards.scrollBy({
          left: cardStep(),
          behavior: "smooth"
        });
      }
    );

    cards.addEventListener(
      "scroll",
      () => {
        requestAnimationFrame(
          updateNav
        );
      },
      { passive: true }
    );

    window.addEventListener(
      "resize",
      () => {
        requestAnimationFrame(
          updateNav
        );
      },
      { passive: true }
    );

    requestAnimationFrame(() => {
      updateNav();
      refreshP4CanvasSizes();
    });

    /*
      Carousel 寬度改變後，
      讓原本 canvas.js 重算 backing size，
      避免圖形被 CSS 拉長。
    */
    if (
      "ResizeObserver" in window
    ) {
      const observer =
        new ResizeObserver(() => {
          refreshP4CanvasSizes();
        });

      observer.observe(
        carousel
      );
    }
  }

  /* -----------------------------------------------------------
     P6 Keyboard assist
     -----------------------------------------------------------
     只處理 focus，不改 viewport 高度。
  */
  /* -----------------------------------------------------------
     P6 手機 / 平板離開表單導覽
     -------------------------------------------------------------
     只建立 UI，不直接操作主程式內部 currentPageIndex。
     點擊後送 everich:mobile-nav 給 main.js。
  */
  function initP6MobileNavigation() {
    const page =
      document.getElementById(
        "messageCardSection"
      );

    const form =
      page?.querySelector(
        ".p5-form-container"
      );

    if (
      !page ||
      !form ||
      form.querySelector(
        ".p5-mobile-exit-nav"
      )
    ) {
      return;
    }

    const nav =
      document.createElement("div");

    nav.className =
      "p5-mobile-exit-nav";

    nav.setAttribute(
      "aria-label",
      "留言表單頁面導覽"
    );

    const homeBtn =
      document.createElement("button");

    homeBtn.type = "button";
    homeBtn.className =
      "p5-mobile-exit-btn";
    homeBtn.textContent =
      "返回首頁";

    const wallBtn =
      document.createElement("button");

    wallBtn.type = "button";
    wallBtn.className =
      "p5-mobile-exit-btn p5-mobile-exit-btn-primary";
    wallBtn.textContent =
      "前往洸語牆";

    function navigate(targetId) {
      window.dispatchEvent(
        new CustomEvent(
          "everich:mobile-nav",
          {
            detail: {
              targetId
            }
          }
        )
      );
    }

    homeBtn.addEventListener(
      "click",
      () => {
        navigate(
          "openingHero"
        );
      }
    );

    wallBtn.addEventListener(
      "click",
      () => {
        navigate(
          "memoryWallSection"
        );
      }
    );

    nav.append(
      homeBtn,
      wallBtn
    );

    form.appendChild(
      nav
    );
  }

  function initP6KeyboardAssist() {
    const page =
      document.getElementById(
        "messageCardSection"
      );

    if (!page) return;

    page.addEventListener(
      "focusin",
      event => {
        const target =
          event.target;

        if (
          !target ||
          !target.matches?.(
            "input, textarea, select"
          )
        ) {
          return;
        }

        window.setTimeout(() => {
          target.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "smooth"
          });
        }, 180);
      }
    );
  }

  function init() {
    initP4Carousel();
    initP6KeyboardAssist();
    initP6MobileNavigation();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
