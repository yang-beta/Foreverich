/* =============================================================
 * js/animations.js
 * 共用 GSAP UI 動畫與 Loading / P1 時間軸
 * -------------------------------------------------------------
 * 箭頭、Skip、Loading Timeline、P1 Banner Timeline 集中於此。
 * 頁面 Canvas 繪製本身不放這裡。
 * ============================================================= */

// 🎯 通用 GSAP 箭頭動畫控制函式（依頁面自動尋找箭頭）
    // =============================================================
    function animateArrow(pageOrArrow) {
      const element = pageOrArrow?.matches?.('.scroll-arrow-btn')
        ? pageOrArrow
        : pageOrArrow?.querySelector?.('.scroll-arrow-btn');
      if (!element || element.dataset.animated === 'true') return;

      element.dataset.animated = 'true';
      element.setAttribute('aria-disabled', 'false');
      gsap.killTweensOf(element);
      gsap.set(element, { y: 0, pointerEvents: 'auto' });

      gsap.to(element, {
        opacity: 1,
        duration: 0.8,
        onComplete: () => {
          gsap.to(element, {
            y: 8,
            duration: 1.0,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut"
          });
        }
      });
    }

    // =============================================================
    // 🎬 4. GSAP 開場與 Banner 時間軸控制
    // =============================================================
    const mainTl = gsap.timeline();

    const openingTextItems = [
      { element: '#line1', duration: 1.5 },
      { element: '#line2', duration: 1.2 },
      { element: '#line3', duration: 1.0 }
    ];

    // LP 所有文字先保持隱藏，避免 HTML / CMS 載入瞬間閃現。
    gsap.set(
      [
        '#lpExhibitionTitle',
        ...openingTextItems.map(item => item.element)
      ],
      {
        y: '200%',
        opacity: 0
      }
    );

    /*
      LP 進入後直接顯示 Skip，
      使用者可略過整段開場。
    */
    mainTl
      .call(() => {
        document
          .getElementById('loadingSkipBtn')
          .classList.add('show');
      })

      // 1. 中央 Logo 先出現
      .to(
        '#logoBox',
        {
          clipPath: 'circle(70% at 50% 50%)',
          scale: 1,
          filter: 'blur(0px)',
          opacity: 1,
          duration: 3.5,
          ease: 'power1.inOut'
        }
      )

      // 2. 「洸 / 限」在 Logo 接近完成時一起浮現
      .to(
        '.lp-side-word',
        {
          opacity: 1,
          scale: 1,
          filter:
            'blur(0px) drop-shadow(0 0 16px rgba(255,255,255,.16))',
          duration: 1.5,
          ease: 'power2.out'
        },
        '-=1.55'
      )

      /*
        3. Logo + 洸限完成後：
           「拾光記憶展」由下往上出現。
           動畫方式與「回憶」相同。
      */
      .to(
        '#lpExhibitionTitle',
        {
          y: '0%',
          opacity: 1,
          duration: 1.5,
          ease: 'power2.out'
        }
      )

      /*
        4. 拾光記憶展「完整出現」後等待 1.5 秒，
           才開始播放「回憶 / 從這裡 / 開始」。
      */
      .to({}, { duration: 1.5 });

    openingTextItems.forEach(
      (item, index) => {
        mainTl.to(
          item.element,
          {
            y: '0%',
            opacity: 1,
            duration: item.duration,
            ease: 'power2.out'
          },
          index === 0
            ? undefined
            : '+=0.2'
        );
      }
    );

    mainTl.call(
      () =>
        animateArrow(
          document.getElementById(
            'openingHero'
          )
        )
    );

    let bannerTimeline = null;
    let isBeamAnimated = false;

    function resetBannerBeamAnimation() {
      bannerTimeline?.kill();
      bannerTimeline = null;
      isBeamAnimated = false;
      gsap.killTweensOf([animationParams, '.bq-part', '#bannerSkipBtn']);

      Object.assign(animationParams, {
        beamDownProgress: 0,
        personProgress: 0,
        horizonSpreadProgress: 0,
        particleGlowProgress: 0
      });

      gsap.set('.bq-part', { y: '115%', opacity: 0 });
      gsap.set('#bannerSkipBtn', { opacity: 1, pointerEvents: 'auto' });
      document.getElementById('bannerSkipBtn').classList.add('show');

      const arrow = document.getElementById('p1ArrowBtn');
      if (arrow) {
        gsap.killTweensOf(arrow);
        arrow.dataset.animated = 'false';
        gsap.set(arrow, { opacity: 0, y: 0, pointerEvents: 'none' });
      arrow.setAttribute('aria-disabled', 'true');
      }
    }

    function playBannerBeamAnimation() {
      resetBannerBeamAnimation();
      isBeamAnimated = true;

      bannerTimeline = gsap.timeline();

      // P1 V4 入場順序：
      // 0.0–3.0s：只畫圓圈線條。
      // 3.0s：文字立即開始。
      // 3.10s 起：人物慢慢淡入。
      // 3.30s 起：珊瑚杏流光 / 粒子慢慢加入。
      // 讓「線條完成 → 文字 → 人與光」形成清楚的視覺層級。
      bannerTimeline
        .to(animationParams, { beamDownProgress: 1, duration: 3.0, ease: "power2.inOut" }, 0)
        .to(animationParams, { personProgress: 1, duration: 1.5, ease: "power2.out" }, 3.10)
        .to(animationParams, { horizonSpreadProgress: 1, duration: 1.8, ease: "power2.out" }, 3.30)
        .to(animationParams, { particleGlowProgress: 1, duration: 1.8, ease: "power1.out" }, 3.30);
      
      const bqParts = gsap.utils.toArray('.bq-part');
      gsap.set(bqParts, { y: "115%", opacity: 0 });

      bqParts.forEach((part, index) => {
        bannerTimeline.to(part, {
          y: "0%",
          opacity: 1,
          duration: 1.4,
          ease: "power2.out"
        }, index === 0 ? 3.00 : "+=1.5");
      });

      bannerTimeline.call(() => animateArrow(document.getElementById('heroSection')));
    }

    function skipLoadingToBanner() {
      mainTl.progress(1);
      goToPage(1);
    }

    function scrollToContent() {
      if (bannerTimeline) {
        bannerTimeline.progress(1);
      } else {
        animationParams.beamDownProgress = 1;
        animationParams.personProgress = 1;
        animationParams.horizonSpreadProgress = 1;
        animationParams.particleGlowProgress = 1;
        gsap.set(".bq-part", { y: "0%", opacity: 1 });
        animateArrow(document.getElementById('heroSection'));
      }
      gsap.to("#bannerSkipBtn", { opacity: 0, pointerEvents: "none", duration: 0.4 });
    }

    // =============================================================


    // =============================================================
    // 品牌故事頁文字動畫｜V4
    // =============================================================
    // =============================================================
    // 品牌故事最終 Slogan｜相機柔焦互動 V11
    // =============================================================
    let brandStoryFocusBound = false;
    let brandStoryTouchFocusTimer = null;

    function updateBrandStoryFocusBounds() {
      const page =
        document.getElementById(
          'brandStorySection'
        );

      const finalCopy =
        page?.querySelector(
          '.brand-story-final-copy'
        );

      if (!page || !finalCopy) return;

      const pageRect =
        page.getBoundingClientRect();

      const leftBracket =
        finalCopy.querySelector(
          '.brand-story-final-bracket-left'
        );

      const rightBracket =
        finalCopy.querySelector(
          '.brand-story-final-bracket-right'
        );

      const leftRect =
        leftBracket?.getBoundingClientRect();

      const rightRect =
        rightBracket?.getBoundingClientRect();

      const copyRect =
        finalCopy.getBoundingClientRect();

      /*
        清晰對焦區改以左右［ ］的實際外緣計算，
        不再使用 final-copy 的 86vw 寬容器。
      */
      const focusLeft =
        leftRect
          ?leftRect.left
          :copyRect.left;

      const focusRight =
        rightRect
          ?rightRect.right
          :copyRect.right;

      const focusTop =
        Math.min(
          leftRect?.top ?? copyRect.top,
          rightRect?.top ?? copyRect.top
        );

      const focusBottom =
        Math.max(
          leftRect?.bottom ?? copyRect.bottom,
          rightRect?.bottom ?? copyRect.bottom
        );

      const left =
        Math.max(
          0,
          focusLeft -
          pageRect.left
        );

      const top =
        Math.max(
          0,
          focusTop -
          pageRect.top
        );

      page.style.setProperty(
        '--focus-left',
        `${left}px`
      );

      page.style.setProperty(
        '--focus-top',
        `${top}px`
      );

      page.style.setProperty(
        '--focus-width',
        `${Math.max(0, focusRight - focusLeft)}px`
      );

      page.style.setProperty(
        '--focus-height',
        `${Math.max(0, focusBottom - focusTop)}px`
      );
    }

    function isPointerInsideBrandStoryBrackets(
      event
    ) {
      const page =
        document.getElementById(
          'brandStorySection'
        );

      const finalCopy =
        page?.querySelector(
          '.brand-story-final-copy'
        );

      const leftBracket =
        finalCopy?.querySelector(
          '.brand-story-final-bracket-left'
        );

      const rightBracket =
        finalCopy?.querySelector(
          '.brand-story-final-bracket-right'
        );

      if (
        !page ||
        !leftBracket ||
        !rightBracket
      ) {
        return false;
      }

      const leftRect =
        leftBracket.getBoundingClientRect();

      const rightRect =
        rightBracket.getBoundingClientRect();

      const left =
        Math.min(
          leftRect.left,
          rightRect.left
        );

      const right =
        Math.max(
          leftRect.right,
          rightRect.right
        );

      const top =
        Math.min(
          leftRect.top,
          rightRect.top
        );

      const bottom =
        Math.max(
          leftRect.bottom,
          rightRect.bottom
        );

      return (
        event.clientX >= left &&
        event.clientX <= right &&
        event.clientY >= top &&
        event.clientY <= bottom
      );
    }

    function setBrandStoryFocusReady(
      ready
    ) {
      const page =
        document.getElementById(
          'brandStorySection'
        );

      if (!page) return;

      page.classList.toggle(
        'brand-story-focus-ready',
        ready
      );

      if (!ready) {
        page.classList.remove(
          'brand-story-focus-active'
        );
      }

      if (ready) {
        requestAnimationFrame(
          updateBrandStoryFocusBounds
        );
      }
    }

    function setBrandStoryFocusActive(
      active
    ) {
      const page =
        document.getElementById(
          'brandStorySection'
        );

      if (
        !page ||
        !page.classList.contains(
          'brand-story-focus-ready'
        )
      ) {
        return;
      }

      page.classList.toggle(
        'brand-story-focus-active',
        active
      );
    }

    function bindBrandStoryFocus() {
      if (brandStoryFocusBound) return;

      const page =
        document.getElementById(
          'brandStorySection'
        );

      const finalCopy =
        page?.querySelector(
          '.brand-story-final-copy'
        );

      if (!page || !finalCopy) return;

      brandStoryFocusBound = true;

      /*
        Desktop：
        不再使用寬達 86vw / 88vw / 90vw 的 finalCopy 當 Hover hit-area。
        改由整個品牌頁的 pointermove 判斷游標是否真正落在左右［ ］內。
      */
      page.addEventListener(
        'pointermove',
        event => {
          if (
            event.pointerType ===
            'touch'
          ) {
            return;
          }

          const inside =
            isPointerInsideBrandStoryBrackets(
              event
            );

          if (inside) {
            updateBrandStoryFocusBounds();
          }

          setBrandStoryFocusActive(
            inside
          );
        }
      );

      page.addEventListener(
        'pointerleave',
        event => {
          if (
            event.pointerType ===
            'touch'
          ) {
            return;
          }

          setBrandStoryFocusActive(false);
        }
      );

      /*
        Mobile / Tablet：
        只有點在左右［ ］框出的區域內才啟用柔焦。
      */
      page.addEventListener(
        'pointerdown',
        event => {
          if (
            event.pointerType !==
              'touch' &&
            event.pointerType !==
              'pen'
          ) {
            return;
          }

          if (
            !isPointerInsideBrandStoryBrackets(
              event
            )
          ) {
            return;
          }

          updateBrandStoryFocusBounds();
          setBrandStoryFocusActive(true);

          clearTimeout(
            brandStoryTouchFocusTimer
          );

          brandStoryTouchFocusTimer =
            setTimeout(
              () =>
                setBrandStoryFocusActive(
                  false
                ),
              2800
            );
        }
      );

      window.addEventListener(
        'resize',
        () => {
          if (
            page.classList.contains(
              'brand-story-focus-ready'
            )
          ) {
            updateBrandStoryFocusBounds();
          }
        }
      );
    }

    bindBrandStoryFocus();

    let brandStoryTimeline = null;

    function resetBrandStoryAnimation() {
      brandStoryTimeline?.kill();
      brandStoryTimeline = null;
      setBrandStoryFocusReady(false);

      const segments = gsap.utils.toArray('#brandStorySection .brand-story-segment');
      const finalLines = gsap.utils.toArray('#brandStorySection .brand-story-final-line');

      gsap.killTweensOf([...segments, ...finalLines]);
      gsap.set(segments, { y: '118%', autoAlpha: 0 });
      gsap.set(finalLines, { y: '118%', autoAlpha: 0 });
      gsap.set(
        '#brandStorySection .brand-story-final-bracket',
        {
          autoAlpha: 0,
          scaleY: .45
        }
      );
      gsap.set('#brandStorySection .brand-story-copy', { autoAlpha: 1 });
      gsap.set('#brandStorySection .brand-story-final-copy', { autoAlpha: 1 });
      gsap.set('#brandStorySection .brand-story-person-wrap', { autoAlpha: 0 });
      gsap.set('#brandStorySkipBtn', { opacity: 1, pointerEvents: 'auto' });
      document.getElementById('brandStorySkipBtn')?.classList.add('show');
    }

    function playBrandStoryAnimation() {
      resetBrandStoryAnimation();

      brandStoryTimeline = gsap.timeline({ defaults: { ease: 'power2.out' } });

      brandStoryTimeline
        .to('#brandStorySection .brand-story-person-wrap', { autoAlpha: 1, duration: 1.2 }, .3)

        // 第一行
        .to('#brandStoryL1A', { y: '0%', autoAlpha: 1, duration: .82 }, .55)
        .to({}, { duration: 1.5 })
        .to('#brandStoryL1B', { y: '0%', autoAlpha: 1, duration: .82 })
        .to({}, { duration: 2.0 })

        // 第二行：整句一次出現
        .to('#brandStoryL2A', { y: '0%', autoAlpha: 1, duration: .9 })
        .to({}, { duration: 2.5 })

        // 第三行
        .to('#brandStoryL3A', { y: '0%', autoAlpha: 1, duration: .82 })
        .to({}, { duration: 1.5 })
        .to('#brandStoryL3B', { y: '0%', autoAlpha: 1, duration: .82 })
        .to({}, { duration: 2.0 })
        .to('#brandStoryL3C', { y: '0%', autoAlpha: 1, duration: .82 })

        // 全部原始品牌文字播放完成後停 2 秒，再清除。
        .to({}, { duration: 2.0 })
        .to('#brandStorySection .brand-story-copy', {
          autoAlpha: 0,
          duration: .58,
          ease: 'power1.inOut'
        })

        // 中央收束句，同樣從下方往上出現。
        .to('#brandStoryFinal1', { y: '0%', autoAlpha: 1, duration: .86 })
        .to({}, { duration: 1.5 })
        .to('#brandStoryFinal2', { y: '0%', autoAlpha: 1, duration: .86 })

        /*
          第二句完整出現後約 1 秒，
          左右方括號才一起展開。
        */
        .to({}, { duration: 1.0 })
        .to(
          '#brandStorySection .brand-story-final-bracket',
          {
            autoAlpha: 1,
            scaleY: 1,
            duration: .62,
            ease: 'power2.out'
          }
        )
        .call(
          () =>
            setBrandStoryFocusReady(
              true
            )
        )
        .to('#brandStorySkipBtn', { opacity: 0, pointerEvents: 'none', duration: .4 }, '+=.4');
    }

    function skipBrandStoryAnimation() {
      brandStoryTimeline?.kill();
      brandStoryTimeline = null;

      // Skip 直接到故事最終狀態：原三行清除，只保留中央兩句。
      gsap.set('#brandStorySection .brand-story-copy', { autoAlpha: 0 });
      gsap.set('#brandStorySection .brand-story-segment', { y: '0%', autoAlpha: 1 });
      gsap.set('#brandStorySection .brand-story-final-copy', { autoAlpha: 1 });
      gsap.set('#brandStorySection .brand-story-final-line', { y: '0%', autoAlpha: 1 });
      gsap.set(
        '#brandStorySection .brand-story-final-bracket',
        {
          autoAlpha: 1,
          scaleY: 1
        }
      );
      setBrandStoryFocusReady(true);
      gsap.set('#brandStorySection .brand-story-person-wrap', { autoAlpha: 1 });
      gsap.to('#brandStorySkipBtn', { opacity: 0, pointerEvents: 'none', duration: .3 });
    }

    function leaveBrandStoryAnimation() {
      brandStoryTimeline?.kill();
      brandStoryTimeline = null;
      clearTimeout(brandStoryTouchFocusTimer);
      setBrandStoryFocusReady(false);
      gsap.killTweensOf(
        '#brandStorySection .brand-story-segment, #brandStorySection .brand-story-final-line, #brandStorySection .brand-story-final-bracket, #brandStorySection .brand-story-copy, #brandStorySection .brand-story-person-wrap, #brandStorySkipBtn'
      );
    }
