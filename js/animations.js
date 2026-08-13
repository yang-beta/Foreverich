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

    document.querySelectorAll('.scroll-arrow-btn').forEach((button) => {
      button.setAttribute('aria-disabled', 'true');
      button.addEventListener('click', (event) => {
        // opacity:0 不等於不可點。只有 animateArrow() 完成啟用後才允許切頁。
        if (button.dataset.animated !== 'true') {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        nextPage();
      });
    });

    document.getElementById('loadingSkipBtn').addEventListener('click', skipLoadingToBanner);
    document.getElementById('bannerSkipBtn').addEventListener('click', scrollToContent);
    document.getElementById('p2SkipBtn').addEventListener('click', skipP2Animation);
    document.getElementById('brandTransitionSkipBtn').addEventListener('click', skipBrandTransitionAnimation);
    document.getElementById('aiReconstructionSkipBtn').addEventListener('click', skipP4Animation);

    // =============================================================
    // 🎬 4. GSAP 開場與 Banner 時間軸控制
    // =============================================================
    const mainTl = gsap.timeline();
    const openingTextItems = [
      { element: '#line1', duration: 1.5 },
      { element: '#line2', duration: 1.2 },
      { element: '#line3', duration: 1.0 }
    ];
    gsap.set(openingTextItems.map(item => item.element), { y: "200%", opacity: 0 });

    mainTl.to(".loading-text-box .char", { opacity: 1, y: 0, duration: 0.6, stagger: 0.7, ease: "power2.out" })
    .call(() => { document.getElementById('loadingSkipBtn').classList.add('show'); })
    .to({}, { duration: 0.8 })
    .to("#loadingText", { opacity: 0, duration: 1.0, ease: "power2.inOut" })
    .to("#logoBox", { clipPath: "circle(70% at 50% 50%)", scale: 1, filter: "blur(0px)", opacity: 1, duration: 3.5, ease: "power1.inOut" }, "-=0.5")
    .to(".lp-side-word", {
      opacity: 1,
      scale: 1,
      filter: "blur(0px) drop-shadow(0 0 16px rgba(255,255,255,.16))",
      duration: 1.5,
      ease: "power2.out"
    }, "-=1.55")
    .to({}, { duration: 1.5 });

    openingTextItems.forEach((item, index) => {
      mainTl.to(item.element, {
        y: "0%",
        opacity: 1,
        duration: item.duration,
        ease: "power2.out"
      }, index === 0 ? undefined : "+=0.2");
    });

    mainTl.call(() => animateArrow(document.getElementById('openingHero')));

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

      // P1 V3 入場順序：
      // 0.0–2.0s 線條逐圈畫出 → 2.0–2.8s 人物淡入
      // → 2.8s 起珊瑚色流光 / 粒子 → 3.05s 起文字。
      bannerTimeline
        .to(animationParams, { beamDownProgress: 1, duration: 2.0, ease: "power2.inOut" }, 0)
        .to(animationParams, { personProgress: 1, duration: 0.8, ease: "power2.out" }, 2.0)
        .to(animationParams, { horizonSpreadProgress: 1, duration: 1.0, ease: "power2.out" }, 2.8)
        .to(animationParams, { particleGlowProgress: 1, duration: 1.0, ease: "power1.out" }, 2.8);
      
      const bqParts = gsap.utils.toArray('.bq-part');
      gsap.set(bqParts, { y: "115%", opacity: 0 });

      bqParts.forEach((part, index) => {
        bannerTimeline.to(part, {
          y: "0%",
          opacity: 1,
          duration: 1.4,
          ease: "power2.out"
        }, index === 0 ? 3.05 : "+=1.5");
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
