/* =============================================================
 * js/main.js
 * 頁面生命週期 / Snap Navigation / P5-P7 / 表單與 Modal
 * -------------------------------------------------------------
 * 新增頁面時優先維護 pageLifecycle Map，不要新增散落的 page index if。
 * ============================================================= */

// 🎯 5. 全頁生命週期與 Snap 滾動控制
    // =============================================================
    const sectionsWrapper = document.getElementById('sectionsWrapper');
    const pageElements = gsap.utils.toArray('.section-page');
    const totalPages = pageElements.length;
    let currentPageIndex = 0;
    let isTransitionLocked = false;
    let isPageAnimationLocked = false;

    function setPageAnimationLock(isLocked) {
      isPageAnimationLocked = isLocked;
    }

    function isNavigationLocked() {
      return isTransitionLocked || isPageAnimationLocked;
    }

    const pageLifecycle = new Map([
      ['openingHero', {
        enter() {
          lCanvas.style.opacity = '1';
          startLoadingCanvas();
          startBackgroundCanvas();
          stopSandCanvas();
        },
        leave() {
          stopLoadingCanvas();
        },
        skip() {
          skipLoadingToBanner();
        }
      }],
      ['heroSection', {
        enter() {
          lCanvas.style.opacity = '0';
          stopLoadingCanvas();
          startBackgroundCanvas();
          stopSandCanvas();

          /*
            CMS 與動畫解耦：
            第一次進 P1 時先等已發布文字套用完成，
            再啟動既有 GSAP Timeline。
            SiteContent.ready 最多等待 2 秒，因此 CMS 網路異常
            不會讓展場頁面永久卡住。
          */
          const playP1WhenContentReady = () => {
            const activePage = pageElements[currentPageIndex];

            // 若等待 CMS 期間使用者已離開 P1，就不要背景播放動畫。
            if (activePage?.id !== 'heroSection') return;

            playBannerBeamAnimation();
          };

          Promise.resolve(window.SiteContent?.ready)
            .then(playP1WhenContentReady)
            .catch(playP1WhenContentReady);
        },
        leave() {
          // 離頁後不讓 P1 Timeline 在背景繼續跑；返回時會重新建立。
          bannerTimeline?.kill();
          bannerTimeline = null;
          isBeamAnimated = false;
        },
        skip() {
          scrollToContent();
        }
      }],
      ['audiovisualSection', {
        enter() {
          lCanvas.style.opacity = '0';
          stopLoadingCanvas();
          stopBackgroundCanvas();
          stopBrandTransitionCanvas();
          playP2Animation();
        },
        leave() {
          leaveP2Page();
        },
        skip() {
          skipP2Animation();
        }
      }],
      ['brandTransitionSection', {
        enter() {
          lCanvas.style.opacity = '0';
          stopLoadingCanvas();
          stopBackgroundCanvas();
          stopSandCanvas();
          stopP4Canvases();
          playBrandTransitionAnimation();
        },
        leave() {
          leaveBrandTransitionPage();
        },
        skip() {
          skipBrandTransitionAnimation();
        }
      }],
      ['aiReconstructionSection', {
        enter() {
          lCanvas.style.opacity = '0';
          stopLoadingCanvas();
          stopBackgroundCanvas();
          stopSandCanvas();
          stopBrandTransitionCanvas();
          playP4Animation();
        },
        leave() {
          leaveP4Page();
        },
        skip() {
          skipP4Animation();
        }
      }],
      ['messageEntrySection', {
        enter() {
          lCanvas.style.opacity = '0';
          stopLoadingCanvas(); stopBackgroundCanvas(); stopSandCanvas(); stopBrandTransitionCanvas(); stopP4Canvases();
          window.enterP5EntryPage?.();
        },
        leave() { window.leaveP5EntryPage?.(); },
        skip() { window.skipP5EntryPage?.(); }
      }],
      ['memoryWallSection', {
        enter() {
          lCanvas.style.opacity = '0';
          stopLoadingCanvas(); stopBackgroundCanvas(); stopSandCanvas(); stopBrandTransitionCanvas(); stopP4Canvases();
          window.enterMemoryWallPage?.();
        },
        leave() { window.leaveMemoryWallPage?.(); }
      }],
      ['messageCardSection', {
        enter() {
          lCanvas.style.opacity = '0';
          stopLoadingCanvas(); stopBackgroundCanvas(); stopSandCanvas(); stopBrandTransitionCanvas(); stopP4Canvases();
          window.enterP6Page?.();
        },
        leave() { window.leaveP6Page?.(); },
        skip() { window.skipP6Page?.(); }
      }],
      ['brandStorySection', {
        enter() {
          lCanvas.style.opacity = '0';

          stopLoadingCanvas();
          stopBackgroundCanvas();
          stopSandCanvas();
          stopBrandTransitionCanvas();
          stopP4Canvases();

          // 品牌故事有自己的背景，避免 P1 最後一幀殘留在底下。
          const globalBgCanvas =
            document.getElementById('mandalaCanvas');

          if (globalBgCanvas) {
            globalBgCanvas.style.opacity = '0';
          }

          startBrandStoryCanvas();
          playBrandStoryAnimation();
        },
        leave() {
          stopBrandStoryCanvas();
          leaveBrandStoryAnimation();

          const globalBgCanvas =
            document.getElementById('mandalaCanvas');

          if (globalBgCanvas) {
            globalBgCanvas.style.opacity = '1';
          }
        },
        skip() {
          skipBrandStoryAnimation();
        }
      }]
    ]);

    /* =============================================================
       Page UI Lifecycle｜Next Arrow + Skip 統一入口
       -------------------------------------------------------------
       Arrow：
       - 顯示時機仍由各頁動畫在完成點呼叫 animateArrow()。
       - Click / reset / aria 狀態統一由此管理。

       Skip：
       - 所有 .skip-anim-btn 只呼叫 skipCurrentPage()。
       - 各頁真正的完成邏輯保留在 pageLifecycle[id].skip()，
         不強迫不同 Timeline / Canvas 共用同一套實作。
       ============================================================= */
    function getPageArrow(page) {
      return page?.querySelector?.('.scroll-arrow-btn') || null;
    }

    function resetPageArrow(page) {
      const arrow = getPageArrow(page);
      if (!arrow) return;

      gsap.killTweensOf(arrow);
      arrow.dataset.animated = 'false';
      arrow.setAttribute('aria-disabled', 'true');
      gsap.set(arrow, {
        opacity: 0,
        y: 0,
        pointerEvents: 'none'
      });
    }

    function skipCurrentPage() {
      const page = pageElements[currentPageIndex];
      if (!page) return;

      const lifecycle = pageLifecycle.get(page.id);
      lifecycle?.skip?.(page);
    }

    document.querySelectorAll('.scroll-arrow-btn').forEach(button => {
      button.setAttribute('aria-disabled', 'true');

      button.addEventListener('click', event => {
        // opacity:0 不代表不可點；只有 animateArrow() 啟用後才可下一頁。
        if (button.dataset.animated !== 'true') {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        nextPage();
      });
    });

    document.querySelectorAll('.skip-anim-btn').forEach(button => {
      button.addEventListener('click', skipCurrentPage);
    });

    function runPageLifecycle(page, phase) {
      const lifecycle = pageLifecycle.get(page.id);
      lifecycle?.[phase]?.(page);
    }

    function goToPage(index) {
      if (index < 0 || index >= totalPages || isNavigationLocked() || index === currentPageIndex) return;

      isTransitionLocked = true;
      const previousPage = pageElements[currentPageIndex];
      const nextPageElement = pageElements[index];

      resetPageArrow(previousPage);
      runPageLifecycle(previousPage, 'leave');
      currentPageIndex = index;
      sectionsWrapper.style.transform = `translateY(-${currentPageIndex * 100}vh)`;
      runPageLifecycle(nextPageElement, 'enter');

      setTimeout(() => { isTransitionLocked = false; }, 850);
    }

    function nextPage() {
      goToPage(currentPageIndex + 1);
    }

    /* =============================================================
       手機 / 平板 P6 專用導覽橋接
       -------------------------------------------------------------
       mobile-fixes.js 不直接碰 currentPageIndex / goToPage，
       而是送出 everich:mobile-nav 自訂事件。
       主程式在這裡統一處理正式頁面生命週期。
       ============================================================= */
    window.addEventListener(
      'everich:mobile-nav',
      event => {
        const targetId =
          event.detail?.targetId;

        if (!targetId) return;

        const target =
          document.getElementById(
            targetId
          );

        const targetIndex =
          pageElements.indexOf(
            target
          );

        if (targetIndex < 0) return;

        goToPage(
          targetIndex
        );
      }
    );


        // =============================================================
        // Page 5｜寄語入口
        // =============================================================
    (() => {
      'use strict';
      const page = document.getElementById('messageEntrySection');
      if (!page) return;
      const lines = gsap.utils.toArray('#messageEntrySection .p5-entry-line');
      const options = document.getElementById('p5EntryOptions');
      const skipBtn = document.getElementById('p5EntrySkipBtn');
      const writeBtn = document.getElementById('p5WriteMemoryBtn');
      const wallBtn = document.getElementById('p5ViewWallBtn');
      const revealRect = document.getElementById('p5HornRevealRect');
      let tl = null;

      // P5 外層喇叭｜中央 -> 左右兩側淡金掃光
      // 只處理 outer horns，不改 inner horns。
      const p5OuterLeft = Array.from(
        page.querySelectorAll('.p5-horn-glow-left ellipse')
      );
      const p5OuterRight = Array.from(
        page.querySelectorAll('.p5-horn-glow-right ellipse')
      );

      let p5HornGlowRafId = null;
      let p5HornGlowStartTime = 0;

      function smooth01(value) {
        const t = Math.max(0, Math.min(1, value));
        return t * t * (3 - 2 * t);
      }

      function clearP5HornGlow() {
        [...p5OuterLeft, ...p5OuterRight].forEach((ellipse) => {
          ellipse.style.stroke = coralRgba('main', 0);
          ellipse.style.opacity = '0';
          ellipse.style.filter = 'none';
        });
      }

      function restartP5HornDrift() {
        const driftGroups = page.querySelectorAll(
          '.p5-horn-full-left, .p5-horn-full-right'
        );

        driftGroups.forEach((group) => {
          group.style.animation = 'none';
          void group.getBoundingClientRect();
          group.style.removeProperty('animation');
        });
      }

      function drawP5HornGlow(timestamp) {
        if (p5HornGlowRafId === null) return;

        const count = Math.min(p5OuterLeft.length, p5OuterRight.length);
        if (!count) {
          p5HornGlowRafId = null;
          return;
        }

        const elapsed = timestamp - p5HornGlowStartTime;

        // 約 7.6 秒由中心走到兩側。
        const progress = ((elapsed * 0.000132) % 1 + 1) % 1;
        const glowIndex = progress * (count - 1);

        // 接近最外側時，提前讓下一輪中央淡入，避免瞬間跳回。
        const crossRange = 0.14;
        const crossT = smooth01(
          (progress - (1 - crossRange)) / crossRange
        );
        const currentFade = 1 - crossT;
        const nextFade = crossT;

        for (let i = 0; i < count; i += 1) {
          const currentDistance = Math.abs(i - glowIndex);
          const currentGlow =
            Math.max(0, 1 - currentDistance / 1.75) * currentFade;

          const nextDistance = Math.abs(i);
          const nextGlow =
            Math.max(0, 1 - nextDistance / 1.75) * nextFade;

          const glow = Math.max(currentGlow, nextGlow);

          const applyGlow = (ellipse) => {
            if (!ellipse) return;

            if (glow <= 0.001) {
              ellipse.style.removeProperty('stroke');
              ellipse.style.removeProperty('filter');
              ellipse.style.removeProperty('opacity');
              return;
            }

            // 獨立 glow layer：像樹枝流光一樣有清楚光芯，
            // 只附帶小範圍柔光，不受底圖 opacity 影響。
            ellipse.style.stroke = coralRgba('main', 1);
            ellipse.style.opacity = '1';
            ellipse.style.filter =
              `drop-shadow(0 0 ${3 + glow * 7}px ${coralRgba('main', 0.30 + glow * 0.48)})
               drop-shadow(0 0 ${7 + glow * 10}px ${coralRgba('glow', 0.10 + glow * 0.20)})`;
          };

          // 同一個 index = 距離中央相同，因此左右同步往外。
          applyGlow(p5OuterLeft[i]);
          applyGlow(p5OuterRight[i]);
        }

        p5HornGlowRafId = requestAnimationFrame(drawP5HornGlow);
      }

      function startP5HornGlow() {
        if (p5HornGlowRafId !== null) return;
        clearP5HornGlow();

        if (!p5OuterLeft.length || !p5OuterRight.length) return;

        p5HornGlowStartTime = performance.now();
        p5HornGlowRafId = requestAnimationFrame(drawP5HornGlow);
      }

      function stopP5HornGlow() {
        if (p5HornGlowRafId !== null) {
          cancelAnimationFrame(p5HornGlowRafId);
          p5HornGlowRafId = null;
        }
        clearP5HornGlow();
      }

      function goToSection(id) {
        const target = document.getElementById(id);
        const index = pageElements.indexOf(target);
        if (index >= 0) goToPage(index);
      }
      function readyOptions() {
        options.classList.add('is-ready');
        options.setAttribute('aria-hidden','false');
      }
      function reset() {
        tl?.kill(); tl=null;
        stopP5HornGlow();

        page.classList.remove('is-horn-revealed');

        gsap.killTweensOf(revealRect);
        gsap.set(revealRect, {
          attr: {
            x: 800,
            width: 0
          }
        });
        gsap.killTweensOf([...lines, options, skipBtn]);
        gsap.set(lines,{y:'115%',autoAlpha:0});
        gsap.set(options,{y:18,autoAlpha:0});
        options.classList.remove('is-ready');
        options.setAttribute('aria-hidden','true');
        gsap.set(skipBtn,{autoAlpha:0,pointerEvents:'none'});
      }
      window.enterP5EntryPage = function() {
        reset();

        // 每次重新進入 P5 都從相同的視覺狀態開始。
        clearP5HornGlow();
        // 先維持 horn 本身靜止，只讓中央遮罩向左右展開。
        page.classList.remove('is-horn-revealed');
        setPageAnimationLock(true);
        tl = gsap.timeline({
          onComplete() {
            readyOptions();
            setPageAnimationLock(false);
            gsap.to(skipBtn,{autoAlpha:0,pointerEvents:'none',duration:.3});
          }
        })
        // SVG 座標系：x 由中心 800 往左移，同時 width 往左右增加。
        .to(
          revealRect,
          {
            attr: {
              x: 0,
              width: 1600
            },
            duration: 2.55,
            ease: 'power2.inOut',
            onComplete() {
              page.classList.add('is-horn-revealed');

              // 完整揭露後才開啟外層 drift 與金色掃光。
              clearP5HornGlow();
              restartP5HornDrift();
              startP5HornGlow();
            }
          },
          0
        )
        .to(skipBtn,{autoAlpha:1,pointerEvents:'auto',duration:.35},.12)
        .to(
          lines,
          {
            y:'0%',
            autoAlpha:1,
            duration:1,
            ease:'power2.out',
            stagger:1.65
          },
          .25
        )
        .to(options,{y:0,autoAlpha:1,duration:.75,ease:'power2.out'},'+=.75')
        .call(readyOptions);
      };
      window.leaveP5EntryPage = function() {
        tl?.kill(); tl=null;
        stopP5HornGlow();
        page.classList.remove('is-horn-revealed');
        gsap.killTweensOf([...lines,options,skipBtn]);
        setPageAnimationLock(false);
      };
      window.skipP5EntryPage = function() {
        if (tl) tl.progress(1);
        else {
          gsap.set(lines,{y:0,autoAlpha:1});
          gsap.set(options,{y:0,autoAlpha:1});
          readyOptions();
          setPageAnimationLock(false);
        }
      };
      writeBtn.addEventListener('click',()=>goToSection('messageCardSection'));
      wallBtn.addEventListener('click',()=>goToSection('memoryWallSection'));
    })();

        // =============================================================
        // Page 7｜洸語牆（最近 12 則留言）
        // =============================================================
    (() => {
      'use strict';
      const page=document.getElementById('memoryWallSection');
      const grid=document.getElementById('memoryWallGrid');
      const continueBtn=document.getElementById('memoryWallContinueBtn');
      if(!page||!grid||!continueBtn) return;
      let fetchToken=0;

      const prevBtn=document.getElementById('memoryWallPrevBtn');
      const nextBtn=document.getElementById('memoryWallNextBtn');

      function randomizeTreeHills(){
        const svg =
          page.querySelector(
            '.memory-wall-tree svg'
          );

        const paths =
          page.querySelectorAll(
            '.memory-tree-hills path'
          );

        if(
          !svg ||
          !paths.length
        ) return;

        /*
          樹已經移除，目前這個 SVG 只負責底部波浪線。
          使用 preserveAspectRatio="none"，
          讓 viewBox 760 寬真正拉滿 100vw，
          不再因原本 meet 比例而只集中在某一側。
        */
        svg.setAttribute(
          'preserveAspectRatio',
          'none'
        );

        /*
          每次進入洸語牆隨機挑 2～4 條品牌色線。
          位置在該次停留期間固定，不閃爍。
        */
        const coralCount =
          2 +
          Math.floor(
            Math.random() * 3
          );

        const coralIndices =
          new Set();

        while(
          coralIndices.size <
          Math.min(
            coralCount,
            paths.length
          )
        ){
          coralIndices.add(
            Math.floor(
              Math.random() *
              paths.length
            )
          );
        }

        paths.forEach(
          (path,index)=>{
            /*
              每條線都從 viewBox 左側外延伸到右側外，
              確保實際顯示一定橫跨整個螢幕。
            */
            const startX =
              -35 -
              Math.random() * 35;

            const endX =
              795 +
              Math.random() * 45;

            const baseY =
              792 +
              index * 9.2 +
              (Math.random() - .5) * 15;

            const segmentCount =
              4 +
              Math.floor(
                Math.random() * 2
              );

            let x = startX;
            let y = baseY;

            let d =
              `M ${x.toFixed(1)} ${y.toFixed(1)}`;

            for(
              let seg=0;
              seg<segmentCount;
              seg+=1
            ){
              const remaining =
                segmentCount - seg;

              const avgWidth =
                (endX - x) /
                remaining;

              const nextX =
                seg ===
                segmentCount - 1
                  ? endX
                  : x +
                    avgWidth *
                    (
                      .82 +
                      Math.random() * .34
                    );

              const amp =
                8 +
                Math.random() * 24;

              const direction =
                Math.random() >
                .5
                  ? 1
                  : -1;

              const nextY =
                baseY +
                direction *
                amp *
                (
                  .25 +
                  Math.random() * .65
                );

              const c1x =
                x +
                (nextX - x) *
                (
                  .20 +
                  Math.random() * .16
                );

              const c2x =
                x +
                (nextX - x) *
                (
                  .66 +
                  Math.random() * .18
                );

              const c1y =
                y +
                direction *
                amp *
                (
                  .35 +
                  Math.random() * .52
                );

              const c2y =
                nextY -
                direction *
                amp *
                (
                  .24 +
                  Math.random() * .42
                );

              d +=
                ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}` +
                ` ${c2x.toFixed(1)} ${c2y.toFixed(1)}` +
                ` ${nextX.toFixed(1)} ${nextY.toFixed(1)}`;

              x = nextX;
              y = nextY;
            }

            path.setAttribute(
              'd',
              d
            );

            if(
              coralIndices.has(
                index
              )
            ){
              path.style.stroke =
                'rgba(255,176,136,.30)';

              path.style.opacity =
                `${.62 + Math.random() * .23}`;

              path.style.strokeWidth =
                `${1.0 + Math.random() * .35}`;
            }else{
              path.style.stroke =
                'rgba(201,190,177,.16)';

              path.style.opacity =
                `${.42 + Math.random() * .30}`;

              path.style.strokeWidth =
                `${.78 + Math.random() * .26}`;
            }
          }
        );
      }

      function randomizeTreeBranches(){
        const svg=page.querySelector('.memory-wall-tree svg');
        if(!svg) return;
        const paths=svg.querySelectorAll('.tree-secondary-branches path');
        paths.forEach((path,index)=>{
          if(!path.dataset.baseD) path.dataset.baseD=path.getAttribute('d')||'';
          const base=path.dataset.baseD;
          let numberIndex=0;
          const varied=base.replace(/-?\d+(?:\.\d+)?/g,(match)=>{
            const value=Number(match);
            /* x/y 控制點只做小幅偏移，越靠樹冠稍大；
               不碰主幹與主枝，因此整棵樹仍保持原本輪廓。 */
            const amp=(index%3===0?7:5);
            const delta=(Math.random()*2-1)*amp;
            numberIndex+=1;
            return (value+delta).toFixed(1);
          });
          path.setAttribute('d',varied);
        });
      }

      function updateWallNav(){
        if(!prevBtn||!nextBtn) return;
        const overflow=grid.scrollWidth>grid.clientWidth+4;
        prevBtn.style.display=overflow?'grid':'none';
        nextBtn.style.display=overflow?'grid':'none';
        if(!overflow) return;
        prevBtn.disabled=grid.scrollLeft<=3;
        nextBtn.disabled=grid.scrollLeft+grid.clientWidth>=grid.scrollWidth-3;
      }

      function wallPageStep(){
        const first=grid.querySelector('.memory-wall-card');
        if(!first) return Math.max(240,grid.clientWidth*.9);
        const styles=getComputedStyle(grid);
        const gap=parseFloat(styles.columnGap||styles.gap)||0;
        return first.getBoundingClientRect().width+gap;
      }

      prevBtn?.addEventListener('click',()=>{
        grid.scrollBy({left:-wallPageStep(),behavior:'smooth'});
      });
      nextBtn?.addEventListener('click',()=>{
        grid.scrollBy({left:wallPageStep(),behavior:'smooth'});
      });
      grid.addEventListener('scroll',()=>requestAnimationFrame(updateWallNav),{passive:true});
      // 樹木已移除，只保留底部波浪線；波浪仍可每次進入略有差異。
      randomizeTreeHills();

      // 統一交給全站 handleResize() 呼叫。
      window.resizeMemoryWallLayout = updateWallNav;

      function goP6(){
        const target=document.getElementById('messageCardSection');
        const index=pageElements.indexOf(target);
        if(index>=0) goToPage(index);
      }
      function parseStoredText(raw=''){
        const s=String(raw||'').trim();
        const m=s.match(/^\[(.*?)\]\s+([\s\S]*?)(?:\s+\((.*?)\))?$/);
        return m ? {target:m[1]||'一份思念',quote:m[2]||'',meta:m[3]||''}
                 : {target:'一份思念',quote:s,meta:''};
      }
      /*
        洸語牆左右固定延伸留言
        -------------------------------------------------------------
        以下 6 筆取自 remembrance-db_rows.csv 中 created_at 最早的 6 筆：
        - 左側 3 張
        - 右側 3 張
        - 固定寫在前端，不再向 Supabase 查詢最舊資料
        - aria-hidden=true，不可點擊、不取得 focus
        因此不會因資料庫讀取失敗而消失。
      */
      const GHOST_WALL_ITEMS = [
        {created_at:'2026-07-13 12:44:10.484986+00',text:'[寵物] "親愛的 大白：在記憶中，你慵懶地露出肚皮躺在窗台邊，溫暖的陽光照亮了我們共度的每一刻。" (大白)'},
        {created_at:'2026-07-13 12:48:15.245555+00',text:'[親人] "親愛的 阿謙：你的貪吃嘴和愛說謊的嘴，讓我記憶猶新，雖然時間無法挽回，但你的笑聲和溫暖，將永遠陪伴我前行。" (阿謙)'},
        {created_at:'2026-07-13 15:08:14.380529+00',text:'[親人] "致 黑柴：你的憨厚老實的個性，讓我記憶猶新，雖然有時拗起來要人命，但那一切，都是我珍惜的回憶。" (黑柴)'},
        {created_at:'2026-07-13 16:22:42.773968+00',text:'[朋友] "親愛的 大斑鳩：你的碎碎念雖然煩人，但那是你對朋友過度關心的體現，願你能記得也關心自己。" (大斑鳩)'},
        {created_at:'2026-07-13 16:24:58.088864+00',text:'[親人] 「致 百果山的阿嬤：每當我想起你，花生粽的香味便飄現，伴隨著你露出假牙的和藹笑容，我的心中充滿了溫暖和甜蜜，感謝你在我心中留下的美好回憶。」 (百果山的阿嬤)'},
        {created_at:'2026-07-14 09:46:43.639015+00',text:'[朋友] "致 水告仔：記憶停留在22班的窗台，張老師的教導仍在我心中回響，一切雖已成為過往，但你的陪伴將永遠是我的溫暖。" (水告仔)'}
      ];

      function resolveWallTheme(targetText=''){
        const raw=String(targetText||'');
        if(/長輩|祖父|祖母|阿公|阿嬤|爺爺|奶奶|外公|外婆/.test(raw)) return 'elder';
        if(/伴侶|愛人|男友|女友|先生|太太|丈夫|妻子/.test(raw)) return 'partner';
        if(/摯友|朋友|好友|同學/.test(raw)) return 'friend';
        if(/毛孩|狗|貓|寵物/.test(raw)) return 'pet';
        if(/過去的自己|自己|曾經的我/.test(raw)) return 'past-self';
        return 'custom';
      }

      function createGhostWallCard(item){
        const d=parseStoredText(item?.text);

        const card=document.createElement('article');
        card.className='memory-wall-card memory-wall-ghost-card';
        card.dataset.cardTheme=resolveWallTheme(d.target);
        card.setAttribute('aria-hidden','true');

        const meta=document.createElement('div');
        meta.className='memory-wall-meta';

        const target=document.createElement('span');
        target.textContent=d.target;

        const date=document.createElement('time');
        date.textContent=item?.created_at
          ?new Date(item.created_at)
            .toLocaleDateString('zh-TW')
            .replace(/\//g,'.')
          :'';

        meta.append(target,date);

        const quote=document.createElement('div');
        quote.className='memory-wall-quote';
        quote.textContent=
          d.quote||
          window.SiteContent?.get?.(
            'wall.default_quote',
            '一束沒有被說出口的思念。'
          );

        const foot=document.createElement('div');
        foot.className='memory-wall-foot';
        foot.textContent=
          d.meta||
          window.SiteContent?.get?.(
            'wall.default_meta',
            '洸限 · 時光寄語'
          );

        card.append(meta,quote,foot);
        return card;
      }

      function ensureGhostWallColumns(){
        const carousel=
          grid.closest(
            '.memory-wall-carousel'
          );

        if(!carousel) return;

        carousel
          .querySelectorAll(
            '.memory-wall-ghost-column'
          )
          .forEach(
            el=>el.remove()
          );

        const left=
          document.createElement('div');

        left.className=
          'memory-wall-ghost-column memory-wall-ghost-left';

        const right=
          document.createElement('div');

        right.className=
          'memory-wall-ghost-column memory-wall-ghost-right';

        GHOST_WALL_ITEMS
          .slice(0,3)
          .forEach(
            item=>
              left.appendChild(
                createGhostWallCard(item)
              )
          );

        GHOST_WALL_ITEMS
          .slice(3,6)
          .forEach(
            item=>
              right.appendChild(
                createGhostWallCard(item)
              )
          );

        carousel.prepend(left);
        carousel.append(right);
      }

      function createCard(item){
        const d=parseStoredText(item?.text);
        const card=document.createElement('article');
        card.className='memory-wall-card';

        const wallTheme = resolveWallTheme(d.target);

        card.dataset.cardTheme = wallTheme;
        card.tabIndex=0;
        card.setAttribute('role','button');
        card.setAttribute('aria-label',`查看寄給 ${d.target || '一份思念'} 的完整時光小卡`);

        const meta=document.createElement('div'); meta.className='memory-wall-meta';
        const target=document.createElement('span'); target.textContent=d.target;
        const date=document.createElement('time');
        date.textContent=item?.created_at?new Date(item.created_at).toLocaleDateString('zh-TW').replace(/\//g,'.'):'';
        meta.append(target,date);

        const quote=document.createElement('div');
        quote.className='memory-wall-quote';
        quote.textContent=d.quote||window.SiteContent?.get?.('wall.default_quote','一束沒有被說出口的思念。');

        const foot=document.createElement('div');
        foot.className='memory-wall-foot';
        foot.textContent=d.meta||window.SiteContent?.get?.('wall.default_meta','洸限 · 時光寄語');

        card.append(meta,quote,foot);

        const openFullCard=()=>{
          if(typeof window.openMemoryWallCard!=='function') return;
          window.openMemoryWallCard({
            target:d.target||'一份思念',
            quote:d.quote||window.SiteContent?.get?.('wall.default_quote','一束沒有被說出口的思念。'),
            meta:d.meta||'',
            date:date.textContent||''
          });
        };

        card.addEventListener('click',openFullCard);
        card.addEventListener('keydown',(event)=>{
          if(event.key==='Enter'||event.key===' '){
            event.preventDefault();
            openFullCard();
          }
        });

        return card;
      }
      async function load(){
        const token=++fetchToken;
        grid.innerHTML=`<div class="memory-wall-loading">${window.SiteContent?.get?.('wall.loading','正在拾起最近的思念微光……')}</div>`;
        try{
          const client=window.getRemembranceSupabaseClient?.();
          if(!client) throw new Error('SUPABASE_CLIENT_UNAVAILABLE');

          /* 中央區域只查詢最新 12 筆真實留言；左右假留言固定由前端產生。 */
          const latestResult=await client
            .from('remembrance-db')
            .select('*')
            .order(
              'created_at',
              {ascending:false}
            )
            .limit(12);

          if(latestResult.error){
            throw latestResult.error;
          }

          if(token!==fetchToken) return;

          const data=
            latestResult.data||[];

          grid.replaceChildren();

          if(!data.length){
            const el=document.createElement('div');
            el.className='memory-wall-empty';
            el.textContent=
              window.SiteContent?.get?.(
                'wall.empty',
                '牆上還沒有思念，等待第一道微光。'
              );
            grid.appendChild(el);
            ensureGhostWallColumns();
            return;
          }

          data
            .slice(0,12)
            .forEach(
              item=>
                grid.appendChild(
                  createCard(item)
                )
            );

          grid.scrollLeft=0;

          ensureGhostWallColumns();

          requestAnimationFrame(
            updateWallNav
          );
        }catch(error){
          console.error('洸語牆讀取失敗:',error);
          if(token!==fetchToken) return;
          grid.innerHTML=`<div class="memory-wall-error">${window.SiteContent?.get?.('wall.error','目前暫時無法讀取洸語牆，請稍後再試。')}</div>`;
        }
      }
      window.enterMemoryWallPage=function(){
        load();
        requestAnimationFrame(updateWallNav);
        // 樹木金光停用：只保留底部波浪線。
        gsap.fromTo('.memory-wall-header',{autoAlpha:0,y:14},{autoAlpha:1,y:0,duration:.7,ease:'power2.out'});
        gsap.fromTo(continueBtn,{autoAlpha:0,y:10},{autoAlpha:1,y:0,duration:.55,delay:.35,ease:'power2.out'});
      };
      window.leaveMemoryWallPage=function(){
        fetchToken+=1;

        window.closeMemoryWallCard?.();
        gsap.killTweensOf(['.memory-wall-header',continueBtn]);
      };
      continueBtn.addEventListener('click',goP6);

      const storyBtn=document.getElementById('memoryWallStoryBtn');
      storyBtn?.addEventListener('click',()=>{
        const target=document.getElementById('brandStorySection');
        const index=pageElements.indexOf(target);
        if(index>=0) goToPage(index);
      });
    })();

    // =============================================================
    // Page 8｜品牌故事（目前內容留白）
    // =============================================================
    (() => {
      const page=document.getElementById('brandStorySection');
      if(!page) return;

      const wallBtn=document.getElementById('brandStoryWallBtn');
      const homeBtn=document.getElementById('brandStoryHomeBtn');

      function goToSection(id){
        const target=document.getElementById(id);
        const index=pageElements.indexOf(target);
        if(index>=0) goToPage(index);
      }

      wallBtn?.addEventListener('click',()=>goToSection('memoryWallSection'));
      homeBtn?.addEventListener('click',()=>goToSection('openingHero'));
    })();


    function resizeAllCanvases() {
      resizeLoadingCanvas();
      resizeBgCanvas();
      resizeSandCanvas();
      resizeBrandTransitionCanvas();
      resizeP4Canvases();
      resizeBrandStoryCanvas();
      window.resizeP5Canvases?.();
      window.resizeMemoryWallLayout?.();
      window.refreshP4CarouselNav?.();
    }

    function handleResize() {
      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        resizeAllCanvases();
        resizeRafId = null;
      });
    }

    window.addEventListener('resize', handleResize, { passive: true });
    resizeAllCanvases();
    runPageLifecycle(pageElements[currentPageIndex], 'enter');

    /* =============================================================
       全站 wheel / swipe 換頁
       -------------------------------------------------------------
       手機 / 平板的 P6（messageCardSection）是「內頁可捲動表單」。
       因此只要目前停在 P6，就完全禁止用 wheel / swipe 換頁。

       P6 前往洸語牆只由原本「生成卡片 → 完成流程」控制。
       這可以避免使用者為了看最後一排情感選項往上滑時，
       被誤判為 nextPage() 而跳到洸語牆。
       ============================================================= */

    function shouldKeepNavigationInsideCurrentPage() {
      const currentPage = pageElements[currentPageIndex];
      if (!currentPage) return false;

      const isMobileOrTablet =
        window.matchMedia('(max-width: 768px)').matches;

      return (
        isMobileOrTablet &&
        currentPage.id === 'messageCardSection'
      );
    }

    window.addEventListener('wheel', (e) => {
      if (isNavigationLocked()) return;

      // P6 手機 / 平板：wheel / trackpad 只負責表單內捲動。
      if (shouldKeepNavigationInsideCurrentPage()) return;

      if (e.deltaY > 20) nextPage();
      else if (e.deltaY < -20) goToPage(currentPageIndex - 1);
    }, { passive: true });

    let touchStartY = 0;

    window.addEventListener(
      'touchstart',
      (e) => {
        touchStartY =
          e.touches[0].clientY;
      },
      { passive: true }
    );

    window.addEventListener(
      'touchend',
      (e) => {
        if (isNavigationLocked()) return;

        // P6 手機 / 平板：
        // 不論目前 scrollTop 在哪裡，都不執行全站 swipe 換頁。
        if (shouldKeepNavigationInsideCurrentPage()) return;

        const deltaY =
          touchStartY -
          e.changedTouches[0].clientY;

        if (deltaY > 50) {
          nextPage();
        } else if (deltaY < -50) {
          goToPage(
            currentPageIndex - 1
          );
        }
      },
      { passive: true }
    );

/* =============================================================
   Page 5｜留言板與寄語小卡
   - 頁面入場／離場由主站 pageLifecycle 呼叫
   - 不建立新的 resize listener；由主站 handleResize 呼叫 resizeP5Canvases()
   - Canvas RAF 僅在卡片消逝期間執行，完成或離頁立即停止
   ============================================================= */
(() => {
  'use strict';

  const P5_API_ENDPOINT = window.P5_API_ENDPOINT || '/api/generate';
  const P5_SUPABASE_URL = 'https://cwlxcsdqoigkutbeemvf.supabase.co';
  const P5_SUPABASE_ANON_KEY = 'sb_publishable_L52BGOl7tE2hBgLnqxnGoA_u6RQ3yrd';

  const page = document.getElementById('messageCardSection');
  if (!page) return;

  const els = {
    spotlight: page.querySelector('.p5-spotlight'),
    stepTarget: document.getElementById('p5StepTarget'),
    targetBtns: gsap.utils.toArray('#messageCardSection .p5-target-btn'),
    customWrap: document.getElementById('p5CustomTargetWrap'),
    customTarget: document.getElementById('p5CustomTarget'),
    stepInput: document.getElementById('p5StepInput'),
    memory: document.getElementById('p5MemoryInput'),
    charCount: document.getElementById('p5CharCount'),
    stepTags: document.getElementById('p5StepTags'),
    tagBtns: gsap.utils.toArray('#messageCardSection .p5-tag-btn'),
    stepSubmit: document.getElementById('p5StepSubmit'),
    generateBtn: document.getElementById('p5GenerateBtn'),
    validation: document.getElementById('p5ValidationMessage'),
    skipBtn: document.getElementById('p5SkipBtn'),
    modal: document.getElementById('p5CardModal'),
    loading: document.getElementById('p5AiLoading'),
    loadingMandala: page.querySelector('.p5-loading-mandala'),
    loadingTitle: page.querySelector('.p5-ai-loading h2'),
    loadingText: page.querySelector('.p5-ai-loading p'),
    ready: document.getElementById('p5CardReady'),
    closeBtn: document.getElementById('p5ModalCloseBtn'),
    card: document.getElementById('p5PrintableCard'),
    cardRecipientIcon: document.getElementById('p5CardRecipientIcon'),
    cardTarget: document.getElementById('p5CardTarget'),
    cardScene: document.getElementById('p5CardScene'),
    cardEmotion: document.getElementById('p5CardEmotion'),
    cardText: document.getElementById('p5CardText'),
    cardDate: document.getElementById('p5CardDate'),
    downloadBtn: document.getElementById('p5DownloadBtn'),
    releaseBtn: document.getElementById('p5ReleaseBtn'),
    sendStatus: document.getElementById('p5SendStatus'),
    dissolveCanvas: document.getElementById('p5DissolveCanvas'),
    outro: document.getElementById('p5Outro'),
    outroLines: gsap.utils.toArray('#messageCardSection .p5-outro-line'),
    outroActions: page.querySelector('.p5-outro-actions'),
    restartBtn: document.getElementById('p5RestartBtn'),
    homeBtn: document.getElementById('p5HomeBtn')
  };

  // Modal 必須離開 transformed .sections-wrapper。
  // 先取得所有 DOM refs 後再搬到 body，避免破壞既有 selector / event 綁定。
  if (els.modal.parentElement !== document.body) {
    document.body.appendChild(els.modal);
  }

  const dissolveCtx = els.dissolveCanvas.getContext('2d');
  let page5TL = null;
  let p5SpotlightTween = null;
  let p5DissolveRafId = null;
  let p5DissolveParticles = [];
  let selectedTarget = '';
  let selectedScene = '';
  let selectedEmotion = '';
  let lastGeneratedQuote = '';
  let cardViewMode = 'generated'; // generated | wall
  let isGenerating = false;
  let isReleasing = false;
  let formAdvancedToInput = false;
  let formAdvancedToTags = false;
  let supabaseClient = null;

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function formatDate() {
    return new Date().toLocaleDateString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).replace(/\//g, '.');
  }

  function getResolvedTarget() {
    const nickname = els.customTarget.value.trim();
    if (!selectedTarget || !nickname) return '';
    return `${selectedTarget} - ${nickname}`;
  }

  function updateGenerateState({ preserveMessage = false } = {}) {
    const target = getResolvedTarget();
    const memoryLength = els.memory.value.trim().length;
    const hasScene = Boolean(selectedScene);
    const hasEmotion = Boolean(selectedEmotion);
    const valid = Boolean(target)
      && memoryLength >= 10
      && memoryLength <= 80
      && hasScene
      && hasEmotion
      && !isGenerating;

    els.generateBtn.disabled = !valid;

    if (!selectedTarget) {
      els.validation.textContent = '';
    } else if (!els.customTarget.value.trim()) {
      els.validation.textContent = '請輸入你想怎麼稱呼這個對象。';
    } else if (memoryLength > 0 && memoryLength < 10) {
      els.validation.textContent = `再寫 ${10 - memoryLength} 個字，就能開始凝聚。`;
    } else if (memoryLength >= 10 && !hasScene && !hasEmotion) {
      els.validation.textContent = '請各選擇一項「場景」與「情感」，再生成卡片。';
    } else if (memoryLength >= 10 && !hasScene) {
      els.validation.textContent = '請先選擇一項場景。';
    } else if (memoryLength >= 10 && !hasEmotion) {
      els.validation.textContent = '請先選擇一項情感。';
    } else if (!preserveMessage) {
      els.validation.textContent = '';
    }
  }

  function revealStep(element, { duration = .6 } = {}) {
    if (!element || element.classList.contains('is-open')) return;
    element.classList.add('is-open');
    element.setAttribute('aria-hidden', 'false');
    const isSubmitStep = element.classList.contains('step-submit');
    gsap.fromTo(element,
      { autoAlpha: 0, y: 22, height: 0, paddingTop: 0, paddingBottom: 0 },
      {
        autoAlpha: 1,
        y: 0,
        height: 'auto',
        paddingTop: isSubmitStep ? 8 : 20,
        paddingBottom: isSubmitStep ? 0 : 20,
        duration,
        ease: 'power2.out',
        clearProps: 'height,paddingTop,paddingBottom'
      }
    );
  }

  function revealInputStep() {
    if (formAdvancedToInput) return;
    formAdvancedToInput = true;
    revealStep(els.stepInput);
  }

  function revealTagsAndSubmit() {
    if (formAdvancedToTags) return;
    formAdvancedToTags = true;
    revealStep(els.stepTags);
    gsap.delayedCall(.15, () => revealStep(els.stepSubmit));
  }

  function chooseTarget(button) {
    els.validation.textContent = '';
    selectedTarget = button.dataset.target || '';
    els.targetBtns.forEach(btn => {
      const active = btn === button;
      btn.classList.toggle('is-selected', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    // 無論選擇哪一種寄件對象，都必須再輸入實際稱呼。
    els.customWrap.setAttribute('aria-hidden', 'false');
    gsap.to(els.customWrap, {
      height: 'auto',
      autoAlpha: 1,
      marginTop: 12,
      duration: .45,
      ease: 'power2.out',
      onComplete: () => {
        if (!els.customTarget.value.trim()) els.customTarget.focus();
      }
    });

    // 此時只展開「稱呼」欄位；至少輸入 1 個有效字元後，才進入 Step 2。
    updateGenerateState();
  }

  function chooseTag(button) {
    els.validation.textContent = '';
    const group = button.dataset.tagGroup;
    const tag = button.dataset.tag;
    const sameGroupBtns = els.tagBtns.filter(btn => btn.dataset.tagGroup === group);
    const wasSelected = button.classList.contains('is-selected');

    sameGroupBtns.forEach(btn => {
      btn.classList.remove('is-selected');
      btn.setAttribute('aria-pressed', 'false');
    });

    if (!wasSelected) {
      button.classList.add('is-selected');
      button.setAttribute('aria-pressed', 'true');
      if (group === 'scene') selectedScene = tag;
      if (group === 'emotion') selectedEmotion = tag;
    } else {
      if (group === 'scene') selectedScene = '';
      if (group === 'emotion') selectedEmotion = '';
    }

    updateGenerateState();
  }

  function updateCharCount() {
    els.validation.textContent = '';
    const length = els.memory.value.length;
    els.charCount.textContent = String(length);
    els.charCount.parentElement.classList.toggle('is-warning', length > 70);
    if (els.memory.value.trim().length >= 10) revealTagsAndSubmit();
    updateGenerateState();
  }

  function buildPrompt(target, userInput, sceneTag, emotionTag) {
    return `[任務]
請把下列資料重新理解後，創作成一段適合印在「時光小卡」上的繁體中文短文。

[重要原則]
1. 「使用者隨筆」是記憶素材，不是待改寫原稿。請先理解意思，再重新組織敘事、句型與意象；不要逐句改寫，也不要直接搬用原句。
2. 「場景標籤」與「情感標籤」只提供方向。不要把標籤文字直接塞進成品，請改用相近但重新創作的畫面、感受或比喻表達。
3. 預設情境是「因時間、距離或生活變化而許久沒有見面」，未來仍可能再次相見。
4. 除非使用者在隨筆中明確提到死亡或離世，否則禁止自行推定對方已死亡，也不要使用「天堂、離世、告別、再也見不到、最後一次、逝去、留下來的人」等暗示死亡或永別的語句。
5. 可以保留必要的稱呼、人物關係、專有名詞與具體記憶事實，但其餘文字需重新創作。

[成品規格]
- 繁體中文 60～100 字。
- 2～3 個短句。
- 溫柔、自然、有微光感，但避免過度煽情。
- 像一段對久未相見之人的思念，而不是悼念文。
- 不要解釋創作過程，不要加標題，不要加引號，直接輸出卡片本文。

[Input Data]
- 思念對象：${target}
- 使用者隨筆：${userInput}
- 場景方向：${sceneTag || '未指定'}
- 情感方向：${emotionTag || '未指定'}

[Output]
只輸出重新創作完成的短文。`;
  }

  async function generateAIQuote(target, userInput, sceneTag, emotionTag) {
    if (window.location.protocol === 'file:') {
      throw new Error('LOCAL_PREVIEW_NO_API');
    }

    let response;
    try {
      response = await fetch(P5_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPrompt(target, userInput, sceneTag, emotionTag) })
      });
    } catch (networkError) {
      throw new Error('API_NETWORK_ERROR');
    }

    if (!response.ok) {
      let serverMessage = '';
      try {
        const errorData = await response.json();
        serverMessage = String(errorData?.error || errorData?.message || '').trim();
      } catch (_) {}

      if (response.status === 404) throw new Error('API_ROUTE_NOT_FOUND');
      if (serverMessage) throw new Error(`API_SERVER_${response.status}:${serverMessage}`);
      throw new Error(`API_HTTP_${response.status}`);
    }

    const data = await response.json();
    const text = String(data?.text || '').trim();
    if (!text || /^\[(系統通道調整中|通道維護報告)\]/.test(text)) {
      throw new Error(text || 'AI 回傳內容為空');
    }
    return text;
  }

  function setModalState(state) {
    const isLoading = state === 'loading';
    const isReady = state === 'ready';
    const isOutro = state === 'outro';

    // Chrome 會阻止把仍含有 focus 的祖先設為 aria-hidden。
    // 在切換 Modal phase 前先把焦點交回 dialog 本身。
    const active = document.activeElement;
    if (active && els.modal.contains(active) && active !== els.modal) {
      active.blur();
      try { els.modal.focus({ preventScroll: true }); } catch (_) {}
    }

    const states = [
      [els.loading, isLoading],
      [els.ready, isReady],
      [els.outro, isOutro]
    ];

    states.forEach(([element, visible]) => {
      element.style.display = visible ? 'flex' : 'none';
      element.setAttribute('aria-hidden', String(!visible));
      if ('inert' in element) element.inert = !visible;
    });
  }

  function openModalForLoading() {
    els.modal.classList.add('is-open');
    els.modal.setAttribute('aria-hidden', 'false');
    if ('inert' in els.modal) els.modal.inert = false;
    gsap.set(els.modal, { autoAlpha: 1 });
    setPageAnimationLock(true);
    setModalState('loading');
    requestAnimationFrame(() => {
      try { els.modal.focus({ preventScroll: true }); } catch (_) {}
    });
    gsap.set([els.loadingMandala, els.loadingTitle, els.loadingText], { autoAlpha: 0, y: 10 });
    gsap.timeline()
      .to(els.loadingMandala, { autoAlpha: 1, y: 0, duration: .7, ease: 'power2.out' })
      .to(els.loadingTitle, { autoAlpha: 1, y: 0, duration: .6, ease: 'power2.out' }, '-=.25')
      .to(els.loadingText, { autoAlpha: 1, y: 0, duration: .5, ease: 'power2.out' }, '-=.2');
  }

  function resolveCardTheme(targetText = '') {
    const raw = String(targetText || '').trim();

    if (/長輩|祖父|祖母|阿公|阿嬤|爺爺|奶奶|外公|外婆/.test(raw)) return 'elder';
    if (/伴侶|愛人|男友|女友|先生|太太|丈夫|妻子/.test(raw)) return 'partner';
    if (/摯友|朋友|好友|同學/.test(raw)) return 'friend';
    if (/毛孩|狗|貓|寵物/.test(raw)) return 'pet';
    if (/過去的自己|自己|曾經的我/.test(raw)) return 'past-self';

    return 'custom';
  }

  function getRecipientIconSvg(theme) {
    const common = `fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"`;

    const icons = {
      elder: `
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path ${common} d="M20 5c-7 0-12.5 5.2-12.5 12.2 0 8.9 6.6 16.6 12.5 17.8 5.9-1.2 12.5-8.9 12.5-17.8C32.5 10.2 27 5 20 5Z"/>
          <path ${common} d="M20 10.5c-4.1 0-7.2 3-7.2 7.1 0 5.6 3.8 10.4 7.2 11.5 3.4-1.1 7.2-5.9 7.2-11.5 0-4.1-3.1-7.1-7.2-7.1Z"/>
          <path ${common} d="M20 15.4c-1.9 0-3.5 1.5-3.5 3.5 0 2.8 1.7 5.1 3.5 5.9 1.8-.8 3.5-3.1 3.5-5.9 0-2-1.6-3.5-3.5-3.5Z"/>
        </svg>`,

      'past-self': `
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle ${common} cx="20" cy="20" r="12"/>
          <path ${common} d="M20 11v9l6 4"/>
          <path ${common} d="M9.2 11.5 6 11.6l.2-3.2"/>
          <path ${common} d="M6.6 11.4A15 15 0 0 1 20 5"/>
        </svg>`,

      partner: `
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle ${common} cx="15.2" cy="20" r="9.3"/>
          <circle ${common} cx="24.8" cy="20" r="9.3"/>
        </svg>`,

      friend: `
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle fill="currentColor" cx="11" cy="26" r="2.1"/>
          <circle fill="currentColor" cx="29" cy="14" r="2.1"/>
          <path ${common} d="M12.8 24.8 27.2 15.2"/>
          <path ${common} d="M11 14.7c4.4 1.6 7.3 3.6 9 6 1.8 2.4 4.7 4.1 9 4.8"/>
          <path ${common} d="m20 7 1.35 3.05L24.5 11.4l-3.15 1.35L20 15.8l-1.35-3.05-3.15-1.35 3.15-1.35L20 7Z"/>
        </svg>`,

      pet: `
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <ellipse ${common} cx="20" cy="25.4" rx="7.4" ry="5.8"/>
          <circle ${common} cx="10.7" cy="18" r="3.15"/>
          <circle ${common} cx="17" cy="13.2" r="3.15"/>
          <circle ${common} cx="23" cy="13.2" r="3.15"/>
          <circle ${common} cx="29.3" cy="18" r="3.15"/>
        </svg>`,

      custom: `
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle fill="currentColor" cx="20" cy="20" r="2.4"/>
          <circle ${common} cx="20" cy="20" r="7"/>
          <circle ${common} cx="20" cy="20" r="12"/>
          <path ${common} d="M20 4.5v6M20 29.5v6M4.5 20h6M29.5 20h6"/>
        </svg>`
    };

    return icons[theme] || icons.custom;
  }

  function applyCardRecipientTheme(targetText = '') {
    const theme = resolveCardTheme(targetText);
    els.card.dataset.cardTheme = theme;
    els.cardRecipientIcon.innerHTML = getRecipientIconSvg(theme);
  }

  function setCardViewMode(mode = 'generated') {
    cardViewMode = mode;
    const isWallView = mode === 'wall';

    els.ready.classList.toggle('is-wall-view', isWallView);
    els.releaseBtn.style.display = isWallView ? 'none' : '';
    els.releaseBtn.disabled = isWallView;

    if (isWallView) {
      els.sendStatus.textContent = '此卡片來自思念洸語牆，可閱讀完整內容並下載保存。';
    }
  }

  function openReadyModal() {
    els.modal.classList.add('is-open');
    els.modal.setAttribute('aria-hidden', 'false');
    if ('inert' in els.modal) els.modal.inert = false;
    gsap.set(els.modal, { autoAlpha: 1 });
    setPageAnimationLock(true);
    setModalState('ready');

    requestAnimationFrame(() => {
      try { els.closeBtn.focus({ preventScroll: true }); } catch (_) {}
    });
  }

  window.openMemoryWallCard = function openMemoryWallCard({
    target = '一份思念',
    quote = '',
    meta = '',
    date = ''
  } = {}) {
    if (!quote) return;

    stopP5DissolveCanvas();
    setCardViewMode('wall');

    const metaParts = String(meta)
      .split('/')
      .map(item => item.trim())
      .filter(Boolean);

    applyCardRecipientTheme(target);

    els.cardTarget.textContent = `寄給 / ${target}`;
    els.cardScene.textContent = `場景 / ${metaParts[0] || '未指定'}`;
    els.cardEmotion.textContent = `情感 / ${metaParts[1] || '未指定'}`;
    els.cardText.textContent = quote;
    els.cardDate.textContent = date || formatDate();

    openReadyModal();

    gsap.fromTo(
      els.ready,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: .28 }
    );

    gsap.fromTo(
      els.card,
      { autoAlpha: 0, scale: .90, y: 18, filter: 'blur(5px)' },
      { autoAlpha: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: .72, ease: 'power3.out' }
    );

    gsap.fromTo(
      '.p5-card-actions',
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: .45, delay: .35, ease: 'power2.out' }
    );
  };

  window.closeMemoryWallCard = function closeMemoryWallCard() {
    if (cardViewMode === 'wall' && els.modal.classList.contains('is-open')) {
      closeModal(true);
    }
  };

  function showGeneratedCard(quote) {
    const target = getResolvedTarget();
    setCardViewMode('generated');
    applyCardRecipientTheme(selectedTarget || target);
    lastGeneratedQuote = quote;
    els.cardTarget.textContent = `寄給 / ${target}`;
    els.cardScene.textContent = `場景 / ${selectedScene || '未指定'}`;
    els.cardEmotion.textContent = `情感 / ${selectedEmotion || '未指定'}`;
    els.cardText.textContent = quote;
    els.cardDate.textContent = formatDate();
    els.sendStatus.textContent = '';

    setModalState('ready');
    gsap.fromTo(els.ready, { autoAlpha: 0 }, { autoAlpha: 1, duration: .35 });
    gsap.fromTo(els.card,
      { autoAlpha: 0, scale: .86, y: 24, filter: 'blur(8px)' },
      { autoAlpha: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: .9, ease: 'power3.out' }
    );
    gsap.fromTo('.p5-card-actions', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .55, delay: .55, ease: 'power2.out' });
  }

  function showGenerateError(message) {
    // API 失敗時不要立刻關閉 Modal，否則使用者只會看到按鈕閃一下。
    // 保留 Modal 並直接顯示實際錯誤，直到使用者點擊畫面返回表單。
    setModalState('loading');
    gsap.killTweensOf([els.loadingMandala, els.loadingTitle, els.loadingText]);
    gsap.to(els.loadingMandala, { autoAlpha: 0.22, scale: 0.9, duration: .35 });
    els.loadingTitle.textContent = '時光通道暫時未能連線';
    els.loadingText.textContent = message;
    gsap.set([els.loadingTitle, els.loadingText], { autoAlpha: 1, y: 0 });

    // 點擊 Loading 區即可回到表單重試；使用 once 避免累積事件。
    els.loading.style.cursor = 'pointer';
    els.loading.addEventListener('click', () => {
      els.loading.style.cursor = '';
      els.loadingTitle.textContent = '正在為你凝結時光的微光．．．';
      els.loadingText.textContent = '你的文字正在被輕輕梳理，請稍候。';
      closeModal(true);
    }, { once: true });
  }

  async function handleGenerate() {
    if (isGenerating) return;
    const target = getResolvedTarget();
    const memory = els.memory.value.trim();
    if (!selectedTarget || !els.customTarget.value.trim() || !target || memory.length < 10 || memory.length > 80 || !selectedScene || !selectedEmotion) {
      updateGenerateState();
      return;
    }

    isGenerating = true;
    els.validation.textContent = '正在開啟時光通道…';
    updateGenerateState({ preserveMessage: true });

    // 先開啟 Modal，再發 API。
    // 即使後端失敗，使用者也會看到明確狀態，而不是只看到按鈕閃一下。
    openModalForLoading();

    try {
      console.info('[P5] 生成流程開始：Modal 已開啟，準備呼叫 /api/generate');
      const [quote] = await Promise.all([
        generateAIQuote(target, memory, selectedScene, selectedEmotion),
        delay(2500)
      ]);
      console.info('[P5] AI 回傳成功，準備顯示時光小卡');
      els.validation.textContent = '';
      showGeneratedCard(quote);
    } catch (error) {
      console.error('P5 AI 生成失敗:', error);

      let errorMessage = '目前時光通道較擁擠，請稍後再試一次。';
      if (error.message === 'LOCAL_PREVIEW_NO_API') {
        errorMessage = '目前是單檔本機預覽，無法呼叫 /api/generate。請使用已部署 API 的網址測試。';
      } else if (error.message === 'API_ROUTE_NOT_FOUND') {
        errorMessage = '找不到 /api/generate。請確認 api/generate.js 已部署在專案的 api 資料夾。';
      } else if (error.message === 'API_NETWORK_ERROR') {
        errorMessage = '無法連線 AI API，請確認目前網址與後端服務是否正常。';
      } else if (error.message.startsWith('API_SERVER_')) {
        const serverMessage = error.message.split(':').slice(1).join(':');
        errorMessage = `AI 後端設定錯誤：${serverMessage}`;
      } else if (error.message.startsWith('API_HTTP_')) {
        errorMessage = `AI API 回傳 ${error.message.replace('API_HTTP_', 'HTTP ')}，請檢查 Vercel Function 與環境變數。`;
      } else if (error.message) {
        errorMessage = `AI 生成失敗：${error.message}`;
      }

      els.validation.textContent = errorMessage;
      showGenerateError(errorMessage);
    } finally {
      isGenerating = false;
      updateGenerateState({ preserveMessage: true });
    }
  }

  async function downloadCard() {
    if (!window.html2canvas) {
      els.sendStatus.textContent = '下載元件尚未載入，請重新整理後再試。';
      return;
    }
    els.downloadBtn.disabled = true;
    try {
      const canvas = await html2canvas(els.card, {
        scale: 3,
        backgroundColor: null,
        useCORS: true
      });
      const link = document.createElement('a');
      const downloadDate = (els.cardDate.textContent || formatDate()).replace(/\./g, '-');
      link.download = `洸限_時光小卡_${downloadDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('P5 卡片下載失敗:', error);
      els.sendStatus.textContent = '卡片輸出失敗，請再試一次。';
    } finally {
      els.downloadBtn.disabled = false;
    }
  }

  function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (!window.supabase?.createClient) return null;
    supabaseClient = window.supabase.createClient(P5_SUPABASE_URL, P5_SUPABASE_ANON_KEY);
    return supabaseClient;
  }
  window.getRemembranceSupabaseClient = getSupabaseClient;

  async function persistCard() {
    const client = getSupabaseClient();
    if (!client) return { skipped: true };
    const target = getResolvedTarget();
    const meta = [selectedScene, selectedEmotion].filter(Boolean).join(' / ');
    const fullText = `[${target}] ${lastGeneratedQuote}${meta ? ` (${meta})` : ''}`;
    const { error } = await client.from('remembrance-db').insert([{ text: fullText }]);
    if (error) throw error;
    return { skipped: false };
  }

  function resizeP5Canvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    els.dissolveCanvas.width = Math.round(window.innerWidth * dpr);
    els.dissolveCanvas.height = Math.round(window.innerHeight * dpr);
    els.dissolveCanvas.style.width = `${window.innerWidth}px`;
    els.dissolveCanvas.style.height = `${window.innerHeight}px`;
    dissolveCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.resizeP5Canvases = resizeP5Canvases;

  function stopP5DissolveCanvas() {
    if (p5DissolveRafId !== null) {
      cancelAnimationFrame(p5DissolveRafId);
      p5DissolveRafId = null;
    }
    p5DissolveParticles = [];
    dissolveCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
  window.stopP5DissolveCanvas = stopP5DissolveCanvas;

  async function buildDissolveParticles() {
    if (!window.html2canvas) return [];
    const snapshot = await html2canvas(els.card, {
      scale: 1,
      backgroundColor: null,
      useCORS: true
    });
    const sourceCtx = snapshot.getContext('2d', { willReadFrequently: true });
    const rect = els.card.getBoundingClientRect();
    const image = sourceCtx.getImageData(0, 0, snapshot.width, snapshot.height);
    const particles = [];
    const step = window.innerWidth <= 768 ? 9 : 7;

    for (let y = 0; y < snapshot.height; y += step) {
      for (let x = 0; x < snapshot.width; x += step) {
        const i = (y * snapshot.width + x) * 4;
        const a = image.data[i + 3];
        if (a < 55 || Math.random() > .72) continue;
        particles.push({
          x: rect.left + (x / snapshot.width) * rect.width,
          y: rect.top + (y / snapshot.height) * rect.height,
          vx: 55 + Math.random() * 120,
          vy: -75 - Math.random() * 150,
          drift: (Math.random() - .28) * 55,
          size: .8 + Math.random() * 1.8,
          alpha: .35 + Math.random() * .65,
          life: 0,
          maxLife: 2.4 + Math.random() * .8,
          r: image.data[i],
          g: Math.max(image.data[i + 1], 125),
          b: Math.min(image.data[i + 2] + 20, 190)
        });
      }
    }
    return particles;
  }

  function runDissolveCanvas(particles) {
    stopP5DissolveCanvas();
    p5DissolveParticles = particles;
    let previous = performance.now();

    const render = (now) => {
      const dt = Math.min((now - previous) / 1000, .034);
      previous = now;
      dissolveCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let alive = 0;

      p5DissolveParticles.forEach(p => {
        if (p.life >= p.maxLife) return;
        alive += 1;
        p.life += dt;
        p.x += (p.vx + p.drift * Math.sin(p.life * 4)) * dt;
        p.y += p.vy * dt;
        p.vy -= 8 * dt;
        const remain = Math.max(0, 1 - p.life / p.maxLife);
        dissolveCtx.beginPath();
        dissolveCtx.fillStyle = `rgba(${Math.max(p.r, 190)}, ${Math.max(p.g, 130)}, ${Math.max(p.b, 70)}, ${p.alpha * remain})`;
        dissolveCtx.arc(p.x, p.y, p.size * (0.6 + remain), 0, Math.PI * 2);
        dissolveCtx.fill();
      });

      if (alive > 0) {
        p5DissolveRafId = requestAnimationFrame(render);
      } else {
        p5DissolveRafId = null;
        dissolveCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    if (p5DissolveRafId === null) p5DissolveRafId = requestAnimationFrame(render);
  }

  async function releaseCard() {
    // 洸語牆開啟的歷史卡片只能閱讀／下載，不能再次寄出。
    if (cardViewMode !== 'generated') return;
    if (isReleasing || !lastGeneratedQuote) return;
    isReleasing = true;
    els.releaseBtn.disabled = true;
    els.downloadBtn.disabled = true;
    els.closeBtn.disabled = true;
    els.sendStatus.textContent = '正在把這份思念寄往時光……';

    try {
      try {
        await persistCard();
        els.sendStatus.textContent = '思念已被收下，正在化作微光。';
      } catch (saveError) {
        console.error('P5 Supabase 儲存失敗:', saveError);
        els.sendStatus.textContent = '雲端暫時沒有回應；仍為你完成這段告別。';
      }

      const particles = await buildDissolveParticles();
      runDissolveCanvas(particles);
      gsap.to(els.card, {
        autoAlpha: 0,
        x: 80,
        y: -55,
        scale: .9,
        filter: 'blur(7px)',
        duration: 3,
        ease: 'power2.inOut'
      });
      gsap.to('.p5-card-actions, .p5-send-status, .p5-modal-close', { autoAlpha: 0, duration: .45 });

      await delay(3000);
      setModalState('outro');
      gsap.set(els.outroLines, { y: '115%', autoAlpha: 0 });
      gsap.set(els.outroActions, { autoAlpha: 0, y: 12 });
      gsap.timeline()
        .to(els.outroLines[0], { y: '0%', autoAlpha: 1, duration: 1, ease: 'power2.out' })
        .to(els.outroLines[1], { y: '0%', autoAlpha: 1, duration: 1, ease: 'power2.out' }, '+=.55')
        .to(els.outroActions, { autoAlpha: 1, y: 0, duration: .6, ease: 'power2.out' }, '+=.6');
    } finally {
      isReleasing = false;
    }
  }

  function closeModal(force = false) {
    if (isReleasing && !force) return;
    stopP5DissolveCanvas();

    const active = document.activeElement;
    if (active && els.modal.contains(active)) active.blur();

    els.modal.classList.remove('is-open');
    els.modal.setAttribute('aria-hidden', 'true');
    if ('inert' in els.modal) els.modal.inert = true;

    setModalState('loading');
    gsap.set(els.card, { clearProps: 'all' });
    gsap.set('.p5-card-actions, .p5-send-status, .p5-modal-close', { clearProps: 'all' });
    els.closeBtn.disabled = false;
    els.downloadBtn.disabled = false;

    // 關閉後回復一般生成卡模式，避免 read-only 狀態殘留。
    setCardViewMode('generated');
    els.releaseBtn.disabled = false;
    setPageAnimationLock(false);

    requestAnimationFrame(() => {
      if (currentPageIndex === pageElements.indexOf(page)) {
        try { els.generateBtn.focus({ preventScroll: true }); } catch (_) {}
      }
    });
  }

  function resetP5Form({ keepPage = true } = {}) {
    selectedTarget = '';
    selectedScene = '';
    selectedEmotion = '';
    lastGeneratedQuote = '';
    formAdvancedToInput = false;
    formAdvancedToTags = false;
    isGenerating = false;
    isReleasing = false;

    els.memory.value = '';
    els.customTarget.value = '';
    els.charCount.textContent = '0';
    els.validation.textContent = '';
    els.targetBtns.forEach(btn => { btn.classList.remove('is-selected'); btn.setAttribute('aria-pressed', 'false'); });
    els.tagBtns.forEach(btn => { btn.classList.remove('is-selected'); btn.setAttribute('aria-pressed', 'false'); });
    gsap.set(els.customWrap, { height: 0, autoAlpha: 0, marginTop: 0 });
    els.customWrap.setAttribute('aria-hidden', 'true');

    [els.stepInput, els.stepTags, els.stepSubmit].forEach(step => {
      step.classList.remove('is-open');
      step.setAttribute('aria-hidden', 'true');
      gsap.set(step, { autoAlpha: 0, y: 24, height: 0, paddingTop: 0, paddingBottom: 0 });
    });
    updateGenerateState();
    if (keepPage) page.scrollTop = 0;
  }

  function stopP5SpotlightPulse() {
    if (p5SpotlightTween) {
      p5SpotlightTween.kill();
      p5SpotlightTween = null;
    }
    gsap.killTweensOf(els.spotlight);
    gsap.set(els.spotlight, { autoAlpha: 0 });
  }

  function startP5SpotlightPulse() {
    stopP5SpotlightPulse();
    // 呼吸速度較上一版放慢 2 倍：
    // 單方向約 2.6 秒，亮→暗完整一輪約 5.2 秒。
    gsap.set(els.spotlight, { autoAlpha: 0.08 });
    p5SpotlightTween = gsap.to(els.spotlight, {
      autoAlpha: 0.92,
      duration: 2.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }

  function resetP5Entrance() {
    if (page5TL) { page5TL.kill(); page5TL = null; }
    stopP5SpotlightPulse();
    gsap.killTweensOf([els.stepTarget, ...els.targetBtns]);
    els.stepTarget.classList.add('is-open');
    els.stepTarget.setAttribute('aria-hidden', 'false');
    gsap.set(els.stepTarget, { autoAlpha: 0, y: 20 });
    gsap.set(els.targetBtns, { autoAlpha: 0, y: 12 });
    gsap.set(els.skipBtn, { autoAlpha: 0, pointerEvents: 'none' });
  }

  function playP5Entrance() {
    resetP5Entrance();
    setPageAnimationLock(true);
    page5TL = gsap.timeline({
      onComplete: () => {
        setPageAnimationLock(false);
        gsap.to(els.skipBtn, { autoAlpha: 0, pointerEvents: 'none', duration: .35 });
      }
    });
    page5TL
      .to(els.skipBtn, { autoAlpha: 1, pointerEvents: 'auto', duration: .35 }, .1)
      .to(els.stepTarget, { autoAlpha: 1, y: 0, duration: .65, ease: 'power2.out' }, .2)
      .to(els.targetBtns, { autoAlpha: 1, y: 0, duration: .45, stagger: .1, ease: 'power2.out' }, .35)
      .call(startP5SpotlightPulse, null, 1.15);
  }

  function skipP5Entrance() {
    if (page5TL) {
      page5TL.progress(1);
      startP5SpotlightPulse();
    } else {
      gsap.set([els.stepTarget, ...els.targetBtns], { autoAlpha: 1, y: 0 });
      startP5SpotlightPulse();
      setPageAnimationLock(false);
    }
    gsap.to(els.skipBtn, { autoAlpha: 0, pointerEvents: 'none', duration: .25 });
  }

  // Page UI Lifecycle 對外介面；實際完成邏輯仍由 skipP5Entrance() 負責。
  window.skipP6Page = skipP5Entrance;

  window.enterP6Page = function enterP6Page() {
    stopP5DissolveCanvas();
    closeModal(true);
    resetP5Form();
    playP5Entrance();
  };

  window.leaveP6Page = function leaveP6Page() {
    if (page5TL) { page5TL.kill(); page5TL = null; }
    stopP5SpotlightPulse();
    stopP5DissolveCanvas();
    if (els.modal.classList.contains('is-open')) closeModal(true);
    gsap.killTweensOf('#messageCardSection *');
    setPageAnimationLock(false);
  };

  els.targetBtns.forEach(btn => btn.addEventListener('click', () => chooseTarget(btn)));

  els.customTarget.addEventListener('input', () => {
    const nicknameLength = els.customTarget.value.trim().length;

    // Step 2 的唯一觸發條件：
    // 已選寄件對象，且稱呼至少有 1 個非空白字元。
    if (selectedTarget && nicknameLength >= 1) {
      revealInputStep();
    }

    updateGenerateState();
  });

  els.memory.addEventListener('input', updateCharCount);
  els.tagBtns.forEach(btn => btn.addEventListener('click', () => chooseTag(btn)));
  els.generateBtn.addEventListener('click', handleGenerate);
  els.closeBtn.addEventListener('click', () => closeModal(false));
  els.downloadBtn.addEventListener('click', downloadCard);
  els.releaseBtn.addEventListener('click', releaseCard);

  els.restartBtn.addEventListener('click', () => {
    closeModal(true);
    resetP5Form();
    playP5Entrance();
  });

  els.homeBtn.addEventListener('click', () => {
    closeModal(true);
    resetP5Form({ keepPage: false });

    const wallPage = document.getElementById('memoryWallSection');
    const wallIndex = pageElements.indexOf(wallPage);

    if (wallIndex >= 0) {
      goToPage(wallIndex);
    }
  });

  resizeP5Canvases();
  resetP5Form({ keepPage: false });
  resetP5Entrance();
})();

  
  /* P4 touch icon override: clearer spiral geometry */
  function drawP4TouchCanvas() {
    const canvas = document.getElementById('p4TouchCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
    const base=Math.min(w,h), active=activeP4Card==='touch';
    const breath=active ? (.90+.10*Math.sin(performance.now()*.00130)) : 1;
    ctx.save(); ctx.translate(w*.5,h*.5);
    ctx.strokeStyle=coralRgba('main', active?.98:.92);
    ctx.lineWidth=2.55; ctx.lineCap='round';
    ctx.shadowColor=coralRgba('main', active?.34:.24);
    ctx.shadowBlur=active?6:3; ctx.globalAlpha=breath;
    const arms=48, innerR=base*.105, outerR=base*.365, turns=1.18, steps=34;
    for(let i=0;i<arms;i++){
      const start=Math.PI*2*i/arms; ctx.beginPath();
      for(let s=0;s<=steps;s++){
        const t=s/steps,e=t*t*(3-2*t),r=innerR+(outerR-innerR)*e;
        const a=start+turns*Math.PI*2*t+.12*Math.sin(t*Math.PI);
        const x=Math.cos(a)*r,y=Math.sin(a)*r;
        s?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
