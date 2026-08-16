/* =============================================================
 * js/canvas.js
 * Canvas / 粒子 / 沙畫 / P1-P4 視覺渲染
 * -------------------------------------------------------------
 * Loading、P1、P2、P3、P4 的 Canvas 與 render loop 集中於此。
 * RAF 啟停仍由既有頁面生命週期控制。
 * ============================================================= */

const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    gsap.config({ force3D: true });

    // 各 Canvas 的 requestAnimationFrame 控制代號
    let loadingRafId = null;
    let backgroundRafId = null;
    let sandRafId = null;
    let brandTransitionRafId = null;
    let p4VisualRafId = null;
    let p4MemoryRafId = null;
    let p4TouchRafId = null;
    let resizeRafId = null;

    // =============================================================
    // 🌊 1. 開場水波紋 Canvas (LP)
    // =============================================================
    const lCanvas = document.getElementById('loadingCanvas');
    const lCtx = lCanvas.getContext('2d');

    function resizeLoadingCanvas() {
      lCanvas.width = window.innerWidth * DPR;
      lCanvas.height = (window.innerHeight * 0.4) * DPR;
    }

    let step = 0;
    let isWaveActive = true;
    const waveParams = Array.from({ length: 20 }, () => ({
      phaseOffset: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.01,
      frequency1: 0.003 + Math.random() * 0.002,
      frequency2: 0.007 + Math.random() * 0.003,
      amplitude: 12 + Math.random() * 8
    }));

    function drawWaveLandscape() {
      if (!isWaveActive || loadingRafId !== null) return;

      const renderLoadingFrame = () => {
        if (!isWaveActive) {
          loadingRafId = null;
          return;
        }
      lCtx.clearRect(0, 0, lCanvas.width, lCanvas.height);
      const W = lCanvas.width, H = lCanvas.height;

      waveParams.forEach((p, i) => {
        lCtx.beginPath();
        lCtx.strokeStyle = coralRgba('deep', 0.05 + (i / 20) * 0.25);
        lCtx.lineWidth = 1.2 * DPR;
        const baseY = H * 0.2 + (i * 8 * DPR);

        for (let x = 0; x <= W; x += 16 * DPR) {
          const wave1 = Math.sin((x * p.frequency1) + (step * p.speed) + p.phaseOffset);
          const wave2 = Math.cos((x * p.frequency2) - (step * p.speed * 0.8) + p.phaseOffset);
          const y = baseY + (wave1 * p.amplitude * DPR) + (wave2 * (p.amplitude * 0.5 * DPR));
          
          if (x === 0) lCtx.moveTo(x, y);
          else lCtx.lineTo(x, y);
        }
        lCtx.stroke();
      });
        step += 1;
        loadingRafId = requestAnimationFrame(renderLoadingFrame);
      };

      renderLoadingFrame();
    }

    function startLoadingCanvas() {
      isWaveActive = true;
      drawWaveLandscape();
    }

    function stopLoadingCanvas() {
      isWaveActive = false;
      if (loadingRafId !== null) {
        cancelAnimationFrame(loadingRafId);
        loadingRafId = null;
      }
    }

    // =============================================================
    // 🌌 2. 全頁背景 Canvas ( Banner 光束 )
    // =============================================================
    const bgCanvas = document.getElementById('mandalaCanvas');
    const bgCtx = bgCanvas.getContext('2d', { alpha: false });
    // P1 人物 PNG
    // 優先讀取 img/man-s.png；若目前放在網站根目錄，則自動 fallback。
    const p1PersonImage = new Image();
    const p1PersonImageSources = ['img/man-s.png', './man-s.png'];
    let p1PersonImageSourceIndex = 0;
    let p1PersonImageReady = false;

    p1PersonImage.onload = () => {
      p1PersonImageReady = true;
    };

    p1PersonImage.onerror = () => {
      p1PersonImageReady = false;
      p1PersonImageSourceIndex += 1;
      if (p1PersonImageSourceIndex < p1PersonImageSources.length) {
        p1PersonImage.src = p1PersonImageSources[p1PersonImageSourceIndex];

      }
    };

    p1PersonImage.src = p1PersonImageSources[p1PersonImageSourceIndex];

    // P1 背景是全螢幕 Canvas，比 LP 的 40vh 波浪負擔高。
    // 僅降低此 Canvas 的內部渲染倍率，不影響 CSS 顯示尺寸。
    const BG_DPR = Math.min(window.devicePixelRatio || 1, 1.1);

    // =============================================================
    // P1 人物顯示設定｜未來只需要調整這一區
    // -------------------------------------------------------------
    // PERSON_SIZE      人物大小
    // PERSON_OPACITY   人物透明度
    // PERSON_Y_OFFSET  垂直位移：正值往下、負值往上
    // SHADOW_OPACITY   暖色地面投影強度
    // =============================================================
    const PERSON_SIZE = 0.074;
    const PERSON_OPACITY = 0.40;
    const PERSON_Y_OFFSET = 20 * BG_DPR;
    const SHADOW_OPACITY = 0.22;

    let isBgCanvasRendering = true;

    function resizeBgCanvas() {
      bgCanvas.width = Math.round(window.innerWidth * BG_DPR);
      bgCanvas.height = Math.round(window.innerHeight * BG_DPR);
    }

    let animationParams = { beamDownProgress: 0, personProgress: 0, horizonSpreadProgress: 0, particleGlowProgress: 0 };
    const coralParticles = Array.from({ length: 46 }, () => ({
      x: Math.random() * window.innerWidth * BG_DPR,
      y: Math.random() * window.innerHeight * BG_DPR,
      size: (Math.random() * 2.5 + 0.8) * BG_DPR,
      alpha: Math.random() * 0.6 + 0.2,
      speedY: (Math.random() - 0.5) * 0.8 * BG_DPR,
      speedX: (Math.random() - 0.5) * 0.5 * BG_DPR,
      pulse: Math.random() * Math.PI
    }));

    // P1 背景｜非同心正圓＋漸增缺口版本
    // 上方：6 點鐘起筆，順時針繪製
    // 下方：12 點鐘起筆，順時針繪製
    // 缺口由最內圈 4% 線性增加至最外圈 8%
    const p1CircleCount = 20;
    const p1CircleProgress = Array.from(
      { length: p1CircleCount },
      (_, i) => (i + 1) / p1CircleCount
    );

    // 缺口由最內圈 3% 線性增加到最外圈 4%
    const P1_INNER_GAP_RATIO = 0.03;
    const P1_OUTER_GAP_RATIO = 0.04;

    const P1_TOP_START_ANGLE = Math.PI / 2;       // 6 點鐘
    const P1_BOTTOM_START_ANGLE = Math.PI * 1.5;  // 12 點鐘

    let globalTime = 0;

    function drawLightBeams() {
      const appear = animationParams.beamDownProgress;
      if (appear <= 0) return;

      const W = bgCanvas.width;
      const H = bgCanvas.height;
      const centerX = W * 0.5;

      // 上下兩組共同靠攏的水平位置：畫面高度約 2/3。
      const horizonY = H * 0.66;

      // 所有圈仍為真正正圓。
      const minRadius = Math.min(W, H) * 0.075;
      const maxRadius = Math.hypot(W, H) * 0.58;

      /*
        非同心的關鍵：
        不再讓所有圓共用相同 centerY。

        上方：
        小圈的 6 點鐘位置較靠上，
        越外圈越接近 horizonY。

        下方：
        小圈的 12 點鐘位置較靠下，
        越外圈越接近 horizonY。
      */
      const topInnerBottomY = H * 0.24;
      const bottomInnerTopY = H * 0.90;

      /*
        下方整組同步上移：
        目標是讓「下方最內圈的 12 點鐘位置」
        剛好接觸「上方最外圈的 6 點鐘位置」。

        上方最外圈的 6 點鐘位置在 converge = 1 時，
        正好就是 horizonY。

        因此先算出下方第 1 圈目前的 12 點鐘位置，
        再把這個差值套用到下方所有圈。
      */
      const firstProgress = 1 / p1CircleCount;
      const firstConverge =
        firstProgress * firstProgress * (3 - 2 * firstProgress);

      const bottomFirstTopPointY =
        bottomInnerTopY +
        (horizonY - bottomInnerTopY) * firstConverge;

      const bottomGroupShiftY =
        bottomFirstTopPointY - horizonY;

      bgCtx.save();
      bgCtx.lineWidth = Math.max(0.78 * BG_DPR, 0.78);
      bgCtx.strokeStyle = `rgba(205, 193, 181, ${0.155 * appear})`;
      bgCtx.shadowColor = coralRgba('main', .035);
      bgCtx.shadowBlur = 1.2 * BG_DPR;
      bgCtx.lineCap = 'round';

      /*
        先建立所有圈的幾何資料。
        這樣上方第 i 圈可以精準讀取「下方倒數第 i 圈」的位置。
      */
      const p1RingGeometry = p1CircleProgress.map((progress, index) => {
        const eased = Math.pow(progress, 1.035);

        const radius =
          minRadius +
          (maxRadius - minRadius) * eased;

        const breathe =
          1 +
          Math.sin(globalTime * 0.006 + index * 0.17) * 0.0018;

        const r = radius * breathe;

        /*
          缺口線性遞增：
          第 1 圈 = 3%
          第 20 圈 = 4%

          20 圈共有 19 個間隔，所以每往外一圈增加：
          (4% - 3%) / 19 ≈ 0.052632%
        */
        const ringT =
          p1CircleCount <= 1
            ? 0
            : index / (p1CircleCount - 1);

        const gapRatio =
          P1_INNER_GAP_RATIO +
          (P1_OUTER_GAP_RATIO - P1_INNER_GAP_RATIO) * ringT;

        const drawRatio = 1 - gapRatio;
        const arcLength = Math.PI * 2 * drawRatio;

        const converge =
          progress * progress * (3 - 2 * progress);

        // 下方組原本的 12 點鐘位置
        const bottomTopPointY =
          bottomInnerTopY +
          (horizonY - bottomInnerTopY) * converge;

        // 套用上一版「下方整組同步往上移」
        const shiftedBottomTopPointY =
          bottomTopPointY - bottomGroupShiftY;

        /*
          接觸點間距再次壓縮：
          上一版保留原始距離的 1/3；
          這次再縮短一半，因此只保留原始距離的 1/6。

          原本：
          distance = shiftedBottomTopPointY - horizonY

          新版：
          distance × 1/3

          這樣：
          1. 下方最內圈仍維持在 horizonY。
          2. 下方越外圈，12 點鐘位置仍依序往上。
          3. 但每一圈之間的垂直間距縮成原本約 1/3。
          4. 上方組因為採反向配對，也會同步縮小間距。
        */
        const compressedBottomTopPointY =
          horizonY +
          (shiftedBottomTopPointY - horizonY) * (1 / 6);

        return {
          index,
          progress,
          r,
          arcLength,
          shiftedBottomTopPointY: compressedBottomTopPointY
        };
      });

      /*
        P1 淡金光暈：
        由內圈單向往外圈擴散，到最外圈後重新從內圈開始。
        沿用既有 renderBg RAF，不額外建立動畫循環。
      */
      const p1GlowProgress =
        ((globalTime * 0.00225) % 1 + 1) % 1;
      const p1CoralReveal = Math.max(0, Math.min(1, animationParams.particleGlowProgress));

      /*
        首尾交叉淡化：
        原本 progress 會 0.999 -> 0 瞬間跳回第一圈。
        現在最後 14% 先讓舊光暈淡出，
        同時讓下一輪第一圈提前淡入，避免跳格。

        上方：內 -> 外
        下方：外 -> 內
      */
      const p1GlowCrossfadeRange = 0.14;

      const smooth01 = (value) => {
        const t = Math.max(0, Math.min(1, value));
        return t * t * (3 - 2 * t);
      };

      const endFade =
        1 -
        smooth01(
          (p1GlowProgress - (1 - p1GlowCrossfadeRange)) /
          p1GlowCrossfadeRange
        );

      const nextCycleFade =
        smooth01(
          (p1GlowProgress - (1 - p1GlowCrossfadeRange)) /
          p1GlowCrossfadeRange
        );

      // 本輪位置
      const p1TopGlowRing =
        p1GlowProgress * (p1CircleCount - 1);

      const p1BottomGlowRing =
        (1 - p1GlowProgress) * (p1CircleCount - 1);

      // 下一輪起始位置（只在尾端 crossfade 時可見）
      const p1NextTopGlowRing = 0;
      const p1NextBottomGlowRing = p1CircleCount - 1;

      p1RingGeometry.forEach((ring, index) => {
        const pairedBottomIndex =
          p1CircleCount - 1 - index;

        const pairedBottom =
          p1RingGeometry[pairedBottomIndex];

        const topBottomPointY =
          pairedBottom.shiftedBottomTopPointY;

        const topCenterY =
          topBottomPointY - ring.r;

        const bottomCenterY =
          ring.shiftedBottomTopPointY + ring.r;

        // -------------------------
        // 上方：本輪內 -> 外
        // -------------------------
        const topDistance =
          Math.abs(index - p1TopGlowRing);

        const topGlowCurrent =
          Math.max(0, 1 - topDistance / 2.35) * endFade;

        // 下一輪第一圈提前淡入
        const topNextDistance =
          Math.abs(index - p1NextTopGlowRing);

        const topGlowNext =
          Math.max(0, 1 - topNextDistance / 2.35) * nextCycleFade;

        const topGlow =
          Math.max(topGlowCurrent, topGlowNext) * p1CoralReveal;

        if (topGlow > 0) {
          bgCtx.save();

          // 光的核心比暈更清楚，接近洸語牆樹枝上的流動金光。
          bgCtx.strokeStyle =
            coralRgba('main', 0.09 + topGlow * 0.29);

          bgCtx.lineWidth =
            Math.max((0.88 + topGlow * 0.24) * BG_DPR, 0.95);

          bgCtx.shadowColor =
            coralRgba('main', 0.06 + topGlow * 0.17);

          bgCtx.shadowBlur =
            (1.5 + topGlow * 3.0) * BG_DPR;

          bgCtx.beginPath();
          bgCtx.arc(
            centerX,
            topCenterY,
            ring.r,
            P1_TOP_START_ANGLE,
            P1_TOP_START_ANGLE + ring.arcLength,
            false
          );
          bgCtx.stroke();

          bgCtx.restore();
        }

        // -------------------------
        // 下方：本輪外 -> 內
        // -------------------------
        const bottomDistance =
          Math.abs(index - p1BottomGlowRing);

        const bottomGlowCurrent =
          Math.max(0, 1 - bottomDistance / 2.35) * endFade;

        // 下一輪最外圈提前淡入
        const bottomNextDistance =
          Math.abs(index - p1NextBottomGlowRing);

        const bottomGlowNext =
          Math.max(0, 1 - bottomNextDistance / 2.35) * nextCycleFade;

        const bottomGlow =
          Math.max(bottomGlowCurrent, bottomGlowNext) * p1CoralReveal;

        if (bottomGlow > 0) {
          bgCtx.save();

          bgCtx.strokeStyle =
            coralRgba('main', 0.09 + bottomGlow * 0.29);

          bgCtx.lineWidth =
            Math.max((0.88 + bottomGlow * 0.24) * BG_DPR, 0.95);

          bgCtx.shadowColor =
            coralRgba('main', 0.06 + bottomGlow * 0.17);

          bgCtx.shadowBlur =
            (1.5 + bottomGlow * 3.0) * BG_DPR;

          bgCtx.beginPath();
          bgCtx.arc(
            centerX,
            bottomCenterY,
            ring.r,
            P1_BOTTOM_START_ANGLE,
            P1_BOTTOM_START_ANGLE + ring.arcLength,
            false
          );
          bgCtx.stroke();

          bgCtx.restore();
        }
      });

      p1RingGeometry.forEach((ring, index) => {
        /*
          P1 入場：
          beamDownProgress 原本就是 1.6 秒。
          現在把它映射成「內圈 -> 外圈」逐圈生成，
          而不是 20 圈同時出現。
        */
        const ringT =
          p1CircleCount <= 1
            ? 0
            : index / (p1CircleCount - 1);

        // 每一圈稍微重疊，整體仍在約 1.6 秒內完成。
        const revealWindow = 0.26;
        const ringRevealRaw =
          (appear - ringT * 0.76) / revealWindow;
        const ringRevealClamped =
          Math.max(0, Math.min(1, ringRevealRaw));
        const ringReveal =
          ringRevealClamped *
          ringRevealClamped *
          (3 - 2 * ringRevealClamped);

        if (ringReveal <= 0.001) return;

        /*
          反向配對：
          上方第 1 圈 -> 下方第 20 圈，
          幾何關係不變；只有「顯示順序」改成由內往外。
        */
        const pairedBottomIndex =
          p1CircleCount - 1 - index;

        const pairedBottom =
          p1RingGeometry[pairedBottomIndex];

        const topBottomPointY =
          pairedBottom.shiftedBottomTopPointY;

        const topCenterY =
          topBottomPointY - ring.r;

        const bottomCenterY =
          ring.shiftedBottomTopPointY + ring.r;

        bgCtx.save();

        // 線條在生成時同步淡入。
        bgCtx.globalAlpha = ringReveal;

        // 每一圈不是瞬間整圈出現，而是由既有起點把弧線畫完。
        const visibleArcLength =
          ring.arcLength * ringReveal;

        // 上方組
        bgCtx.beginPath();
        bgCtx.arc(
          centerX,
          topCenterY,
          ring.r,
          P1_TOP_START_ANGLE,
          P1_TOP_START_ANGLE + visibleArcLength,
          false
        );
        bgCtx.stroke();

        // 下方組
        bgCtx.beginPath();
        bgCtx.arc(
          centerX,
          bottomCenterY,
          ring.r,
          P1_BOTTOM_START_ANGLE,
          P1_BOTTOM_START_ANGLE + visibleArcLength,
          false
        );
        bgCtx.stroke();

        bgCtx.restore();
      });


      /*
        P1 人物｜改用 man-s.png
        -------------------------------------------------------------
        定位問題的真正原因不是文字把人物往下壓。
        舊版雖然 personContactY 已經是紅線高度，但 Canvas 人形以紅線
        當「局部座標原點」後，腿仍繼續往下畫，因此腳底自然低於紅線。

        新版直接讓 PNG 的「圖片底部」= personContactY。
        所以人物腳底會真正落在紅線上，文字不參與人物座標計算。
      */
      const personContactY =
        p1RingGeometry[p1CircleCount - 1]
          .shiftedBottomTopPointY;

      // 人物永遠保持畫面水平正中央。
      const personX = centerX;

      // 人物不需要大；只控制高度，寬度依 PNG 原始比例計算。
      const personH =
        Math.max(
          44 * BG_DPR,
          Math.min(W, H) * PERSON_SIZE
        );

      const personReveal = Math.max(0, Math.min(1, animationParams.personProgress));
      const personEase = personReveal * personReveal * (3 - 2 * personReveal);

      if (personEase > 0.001 && p1PersonImageReady) {
        const naturalW = p1PersonImage.naturalWidth || 30;
        const naturalH = p1PersonImage.naturalHeight || 80;
        const personW = personH * (naturalW / naturalH);

        // 精準定位：
        // X：人物中心 = 畫面中心
        // Y：PNG 最底部 = 紅線
        const personDrawX = personX - personW / 2;

        // PERSON_Y_OFFSET > 0：往下；< 0：往上
        const personDrawY =
          personContactY - personH + PERSON_Y_OFFSET;

        // 人物實際腳底位置，陰影也以此為基準。
        const personFootY =
          personContactY + PERSON_Y_OFFSET;

        bgCtx.save();

        // ---------------------------------------------------------
        // 地面暖色暗影
        // ---------------------------------------------------------
        // 從人物腳底向左下 / 右下攤開。
        // 使用 Deep Coral，避免黑色陰影在深色背景裡完全消失。
        bgCtx.save();

        const shadowCenterX = personX;
        const shadowCenterY =
          personFootY + personH * 0.050;

        const shadowRadiusX = personW * 1.65;
        const shadowRadiusY = personH * 0.090;

        const groundShadow = bgCtx.createRadialGradient(
          shadowCenterX,
          shadowCenterY,
          0,
          shadowCenterX,
          shadowCenterY,
          shadowRadiusX
        );

        groundShadow.addColorStop(
          0,
          coralRgba(
            'deep',
            SHADOW_OPACITY * 0.95 * personEase
          )
        );

        groundShadow.addColorStop(
          0.38,
          coralRgba(
            'deep',
            SHADOW_OPACITY * 0.62 * personEase
          )
        );

        groundShadow.addColorStop(
          0.72,
          coralRgba(
            'deep',
            SHADOW_OPACITY * 0.24 * personEase
          )
        );

        groundShadow.addColorStop(
          1,
          coralRgba('deep', 0)
        );

        bgCtx.fillStyle = groundShadow;
        bgCtx.filter = `blur(${2.2 * BG_DPR}px)`;

        // 中央橢圓
        bgCtx.beginPath();
        bgCtx.ellipse(
          shadowCenterX,
          shadowCenterY,
          shadowRadiusX,
          shadowRadiusY,
          0,
          0,
          Math.PI * 2
        );
        bgCtx.fill();

        // 左下延伸
        bgCtx.globalAlpha = 0.72;
        bgCtx.beginPath();
        bgCtx.ellipse(
          shadowCenterX - personW * 0.74,
          shadowCenterY + personH * 0.030,
          shadowRadiusX * 0.74,
          shadowRadiusY * 0.78,
          -0.10,
          0,
          Math.PI * 2
        );
        bgCtx.fill();

        // 右下延伸
        bgCtx.beginPath();
        bgCtx.ellipse(
          shadowCenterX + personW * 0.74,
          shadowCenterY + personH * 0.030,
          shadowRadiusX * 0.74,
          shadowRadiusY * 0.78,
          0.10,
          0,
          Math.PI * 2
        );
        bgCtx.fill();

        bgCtx.restore();

        // 人物透明度由 PERSON_OPACITY 集中控制。
        // personEase 僅保留原本「慢慢出現」的動畫。
        bgCtx.globalAlpha =
          PERSON_OPACITY * personEase;
        bgCtx.shadowColor = coralRgba('main', 0.14 * personEase);
        bgCtx.shadowBlur = 5 * BG_DPR;

        bgCtx.drawImage(
          p1PersonImage,
          personDrawX,
          personDrawY,
          personW,
          personH
        );

        bgCtx.restore();
      }
      bgCtx.restore();

      bgCtx.restore();
    }

    function drawCoralParticles() {
      if (animationParams.particleGlowProgress <= 0) return;
      coralParticles.forEach(p => {
        p.x = (p.x + p.speedX + bgCanvas.width) % bgCanvas.width;
        p.y = (p.y + p.speedY + bgCanvas.height) % bgCanvas.height;
        p.pulse += 0.02;

        bgCtx.save();
        bgCtx.fillStyle = coralRgba('light', Math.max(0, (Math.sin(p.pulse) * 0.2 + p.alpha) * animationParams.particleGlowProgress));
        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.restore();
      });
    }

    function renderBg() {
      if (!isBgCanvasRendering || backgroundRafId !== null) return;

      const renderBackgroundFrame = () => {
        if (!isBgCanvasRendering) {
          backgroundRafId = null;
          return;
        }
      globalTime += 1;
      bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
      bgCtx.fillStyle = 'rgba(26, 26, 26, 1)';
      bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

        drawLightBeams();
        drawCoralParticles();
        backgroundRafId = requestAnimationFrame(renderBackgroundFrame);
      };

      renderBackgroundFrame();
    }

    function startBackgroundCanvas() {
      isBgCanvasRendering = true;
      renderBg();
    }

    function stopBackgroundCanvas() {
      isBgCanvasRendering = false;
      if (backgroundRafId !== null) {
        cancelAnimationFrame(backgroundRafId);
        backgroundRafId = null;
      }
    }

    // =============================================================
    // ⏳ 3. 沙畫動畫與語序時間軸
    // =============================================================
    const sandCanvas = document.getElementById('CanvasAnime');
    const sandCtx = sandCanvas.getContext('2d');

    function resizeSandCanvas() {
      sandCanvas.width = window.innerWidth * DPR;
      sandCanvas.height = window.innerHeight * DPR;
    }

    // P2 沙畫圖片順序固定；四張圖片仍使用隨機位置配置。
    const P2_IMAGE_SEQUENCE = [
      './img/lovers-l.png',
      './img/fistBump.png',
      './img/grandmom-l.png',
      './img/dog-l.png'
    ];

    // 四張圖分別與四組故事文字同步開始。
    const P2_IMAGE_START_TIMES = [1.5, 7.1, 12.7, 18.3];

    const PLUM_POSITIONS = [
      { xRatio: 0.25, yRatio: 0.30 },
      { xRatio: 0.75, yRatio: 0.30 },
      { xRatio: 0.25, yRatio: 0.70 },
      { xRatio: 0.75, yRatio: 0.70 },
      { xRatio: 0.50, yRatio: 0.50 }
    ];

    let floatingDustParticles = [];
    let sandImageParticleGroups = [];
    let sandGlobalProgress = { t: 0 };
    let totalAnimationDuration = 26.3;
    let isSandAssetsReady = false;
    let sandAssetsPromise = null;
    let p2TextTimeline = null;
    let p2SandTimeline = null;
    let isP2Completed = false;
    let p2PlayToken = 0;

    class FloatingDust {
      constructor() {
        this.x = Math.random() * sandCanvas.width;
        this.y = Math.random() * sandCanvas.height;
        this.size = (Math.random() * 2.2 + 0.8) * DPR;
        this.vx = (Math.random() - 0.5) * 0.8 * DPR;
        this.vy = (Math.random() - 0.5) * 0.8 * DPR;
        this.baseAlpha = Math.random() * 0.6 + 0.3;
        this.pulseSpeed = Math.random() * 0.02 + 0.005;
      }
      update() {
        this.x = (this.x + this.vx + sandCanvas.width) % sandCanvas.width;
        this.y = (this.y + this.vy + sandCanvas.height) % sandCanvas.height;
      }
      draw() {
        sandCtx.save();
        sandCtx.fillStyle = coralRgba('light', this.baseAlpha + Math.sin(Date.now() * this.pulseSpeed) * 0.2);
        sandCtx.beginPath();
        sandCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        sandCtx.fill();
        sandCtx.restore();
      }
    }

    class SandParticle {
      constructor(targetX, targetY, delay) {
        this.targetX = targetX;
        this.targetY = targetY;
        this.delay = delay;
        this.startX = -Math.random() * sandCanvas.width * 0.4 - 50;
        this.startY = targetY + (Math.random() - 0.5) * 200 * DPR;
        this.endX = sandCanvas.width + Math.random() * sandCanvas.width * 0.4 + 50;
        this.endY = targetY + (Math.random() - 0.5) * 200 * DPR;
        this.x = this.startX;
        this.y = this.startY;
        this.size = (Math.random() * 1.0 + 0.8) * DPR;
        this.baseAlpha = Math.random() * 0.65 + 0.35;
        this.alpha = 0;
        this.noiseX = (Math.random() - 0.5) * 1.8 * DPR;
        this.noiseY = (Math.random() - 0.5) * 1.8 * DPR;
      }
      update(totalElapsedSec) {
        const localTime = totalElapsedSec - this.delay;
        if (localTime < 0 || localTime > 7.5) { this.alpha = 0; return; }
        const progress = localTime / 7.5;

        if (progress < 0.25) {
          const p = progress / 0.25;
          this.x = this.startX + (this.targetX - this.startX) * (1 - Math.pow(1 - p, 2));
          this.y = this.startY + (this.targetY - this.startY) * (1 - Math.pow(1 - p, 2));
          this.alpha = Math.min(1, p * 1.5) * this.baseAlpha;
        } else if (progress <= 0.70) {
          this.x = this.targetX + Math.sin(Date.now() * 0.003 + this.targetY) * this.noiseX;
          this.y = this.targetY + Math.cos(Date.now() * 0.003 + this.targetX) * this.noiseY;
          this.alpha = this.baseAlpha;
        } else {
          const p = (progress - 0.70) / 0.30;
          this.x = this.targetX + (this.endX - this.targetX) * (p * p);
          this.y = this.targetY + (this.endY - this.targetY) * (p * p);
          this.alpha = this.baseAlpha * (1 - p);
        }
      }
      draw() {
        if (this.alpha <= 0) return;
        sandCtx.fillStyle = coralRgba('light', this.alpha);
        sandCtx.beginPath();
        sandCtx.arc(this.x | 0, this.y | 0, this.size, 0, Math.PI * 2);
        sandCtx.fill();
      }
    }

    // =============================================================
    // ✨ 共用文字動畫工具
    // =============================================================
    function createSequentialTextAnimation({
      timeline = gsap.timeline(),
      elements,
      fromY = "115%",
      enterDuration = 1.0,
      enterEase = "power2.out",
      gap = 0,
      firstPosition,
      onComplete
    }) {
      const items = gsap.utils.toArray(elements);
      gsap.set(items, { y: fromY, opacity: 0 });

      items.forEach((item, index) => {
        const position = index === 0 ? firstPosition : `+=${gap}`;
        timeline.to(item, {
          y: "0%",
          opacity: 1,
          duration: enterDuration,
          ease: enterEase
        }, position);
      });

      if (onComplete) timeline.call(onComplete);
      return timeline;
    }

    function createGroupedStoryAnimation({
      timeline = gsap.timeline(),
      groups,
      startDelay = 0,
      onComplete
    }) {
      if (startDelay > 0) timeline.to({}, { duration: startDelay });

      groups.forEach(({ line, parts, keepVisible = false }) => {
        gsap.set(line, { y: "115%", opacity: 0 });
        gsap.set(parts, { opacity: 0 });

        timeline.to(line, {
          y: "0%",
          opacity: 1,
          duration: 1.0,
          ease: "power2.out"
        });

        parts.forEach((part, index) => {
          timeline.to(part, {
            opacity: 1,
            duration: 0.8,
            ease: "power1.out"
          }, index === 0 ? "<" : "+=1.5");
        });

        if (!keepVisible) {
          timeline.to(line, {
            opacity: 0,
            duration: 0.8,
            ease: "power2.inOut"
          }, "+=1.0").to({}, { duration: 0.5 });
        } else {
          // 保留文字，但仍保留原本「停留 1.0 + 淡出 0.8 + 空白 0.5」的 2.3 秒時距，
          // 因此後續各句的出現時間點完全不變。
          timeline.to({}, { duration: 2.3 });
        }
      });

      if (onComplete) timeline.call(onComplete);
      return timeline;
    }

    function resetP2VisualState() {
      const section = document.getElementById('audiovisualSection');
      const arrow = section.querySelector('.scroll-arrow-btn');
      const skipBtn = document.getElementById('p2SkipBtn');
      const storyLines = section.querySelectorAll('.story-line');
      const animatedParts = section.querySelectorAll('.sub-part, #fPart1, #fPart2, .dot-char');

      p2TextTimeline?.kill();
      p2SandTimeline?.kill();
      p2TextTimeline = null;
      p2SandTimeline = null;
      gsap.killTweensOf([storyLines, animatedParts, arrow, skipBtn]);

      gsap.set(storyLines, { y: '115%', opacity: 0 });
      gsap.set(animatedParts, { opacity: 0 });
      gsap.set(arrow, { opacity: 0, y: 0, pointerEvents: 'none' });
      arrow.setAttribute('aria-disabled', 'true');
      arrow.dataset.animated = 'false';
      gsap.set(skipBtn, { opacity: 1, pointerEvents: 'auto' });
      skipBtn.classList.add('show');

      sandGlobalProgress.t = 0;
      isP2Completed = false;
      sandCtx.clearRect(0, 0, sandCanvas.width, sandCanvas.height);
    }

    function playTextAnimationSequence() {
      const storyLines = gsap.utils.toArray('#text-container .story-line:not(#coralLine)');
      const storyGroups = storyLines.map((line) => ({
        line,
        parts: gsap.utils.toArray(line.querySelectorAll('.sub-part')),
        keepVisible: true
      }));

      p2TextTimeline = gsap.timeline();
      createGroupedStoryAnimation({
        timeline: p2TextTimeline,
        groups: storyGroups,
        startDelay: 1.5
      });

      const coralLine = document.getElementById('coralLine');
      gsap.set(coralLine, { y: '115%', opacity: 0 });
      gsap.set(coralLine.querySelectorAll('.ui-animate-text'), { opacity: 0 });

      p2TextTimeline
        .to(coralLine, { y: '0%', opacity: 1, duration: 1.5, ease: 'power2.out' })
        .to('#fPart1', { opacity: 1, duration: 1.2, ease: 'power1.out' }, '-=1.2')
        .to('#dot1', { opacity: 1, duration: 0.3 }, '+=0.4')
        .to('#dot2', { opacity: 1, duration: 0.3 }, '+=0.3')
        .to('#dot3', { opacity: 1, duration: 0.3 }, '+=0.3')
        .to('#fPart2', { opacity: 1, duration: 1.5, ease: 'power1.out' }, '+=0.5')
        .call(completeP2Animation);
    }

    function shuffleP2Positions() {
      return [...PLUM_POSITIONS]
        .sort(() => Math.random() - 0.5)
        .slice(0, P2_IMAGE_SEQUENCE.length);
    }

    async function prepareSandArtAssets() {
      if (sandAssetsPromise) return sandAssetsPromise;

      sandAssetsPromise = (async () => {
        floatingDustParticles = Array.from({ length: 45 }, () => new FloatingDust());
        const positions = shuffleP2Positions();

        const loadPromises = P2_IMAGE_SEQUENCE.map((src, index) => new Promise((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = () => {
            const isMobile = window.innerWidth <= 768;
            const targetWidth = (isMobile ? 260 : 420) * DPR;
            const scale = targetWidth / img.width;
            const imgW = img.width * scale;
            const imgH = img.height * scale;
            const finalX = positions[index].xRatio * sandCanvas.width;
            const finalY = positions[index].yRatio * sandCanvas.height;

            const offscreen = document.createElement('canvas');
            offscreen.width = sandCanvas.width;
            offscreen.height = sandCanvas.height;
            const offCtx = offscreen.getContext('2d');
            offCtx.drawImage(img, finalX - imgW / 2, finalY - imgH / 2, imgW, imgH);

            const data = offCtx.getImageData(0, 0, sandCanvas.width, sandCanvas.height).data;
            const particles = [];
            const gap = Math.round(3 * DPR);

            for (let y = 0; y < sandCanvas.height; y += gap) {
              for (let x = 0; x < sandCanvas.width; x += gap) {
                const pixelIndex = (y * sandCanvas.width + x) * 4;
                const alpha = data[pixelIndex + 3];
                const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
                if (alpha > 50 && brightness < 230) {
                  particles.push(new SandParticle(x, y, P2_IMAGE_START_TIMES[index]));
                }
              }
            }
            resolve(particles);
          };
          img.onerror = () => {
            console.error(`P2 沙畫圖片載入失敗：${src}`);
            resolve([]);
          };
        }));

        sandImageParticleGroups = await Promise.all(loadPromises);
        isSandAssetsReady = true;
      })();

      return sandAssetsPromise;
    }

    async function playP2Animation() {
      const playToken = ++p2PlayToken;
      resetP2VisualState();
      await prepareSandArtAssets();

      // 使用者在圖片載入完成前已離開 P2 時，不啟動背景動畫。
      if (playToken !== p2PlayToken || isP2Completed ||
          currentPageIndex !== pageElements.indexOf(document.getElementById('audiovisualSection'))) return;

      playTextAnimationSequence();
      p2SandTimeline = gsap.to(sandGlobalProgress, {
        t: totalAnimationDuration,
        duration: totalAnimationDuration,
        ease: 'none'
      });
      animateSand();
    }

    function completeP2Animation() {
      if (isP2Completed) return;
      isP2Completed = true;
      animateArrow(document.getElementById('audiovisualSection'));
      gsap.to('#p2SkipBtn', { opacity: 0, pointerEvents: 'none', duration: 0.4 });
    }

    function skipP2Animation() {
      p2PlayToken += 1;
      p2TextTimeline?.kill();
      p2SandTimeline?.kill();
      p2TextTimeline = null;
      p2SandTimeline = null;
      sandGlobalProgress.t = totalAnimationDuration;

      // Skip 的終點必須與正常播放完成後一致：前四組故事保留，第五組金句也顯示。
      const storyLines = gsap.utils.toArray('#text-container .story-line:not(#coralLine)');
      const storyParts = storyLines.flatMap(line => gsap.utils.toArray(line.querySelectorAll('.sub-part')));
      gsap.set(storyLines, { opacity: 1, y: '0%' });
      gsap.set(storyParts, { opacity: 1 });
      gsap.set('#coralLine', { opacity: 1, y: '0%' });
      gsap.set('#fPart1, #dot1, #dot2, #dot3, #fPart2', { opacity: 1 });

      completeP2Animation();
      animateSand();
    }

    function leaveP2Page() {
      // 離開 P2 時停止所有只屬於 P2 的運算；回到 P2 時由 playP2Animation() 從頭建立。
      p2PlayToken += 1;
      p2TextTimeline?.kill();
      p2SandTimeline?.kill();
      p2TextTimeline = null;
      p2SandTimeline = null;
      stopSandCanvas();
    }

    function animateSand() {
      if (sandRafId !== null || !isSandAssetsReady) return;

      const p2Index = pageElements.indexOf(document.getElementById('audiovisualSection'));
      const renderSandFrame = () => {
        if (currentPageIndex !== p2Index) {
          sandRafId = null;
          return;
        }

        sandCtx.clearRect(0, 0, sandCanvas.width, sandCanvas.height);
        floatingDustParticles.forEach((dust) => { dust.update(); dust.draw(); });
        sandImageParticleGroups.forEach((group) => {
          group.forEach((particle) => { particle.update(sandGlobalProgress.t); particle.draw(); });
        });
        sandRafId = requestAnimationFrame(renderSandFrame);
      };

      renderSandFrame();
    }

    function stopSandCanvas() {
      p2PlayToken += 1;
      p2TextTimeline?.pause();
      p2SandTimeline?.pause();
      if (sandRafId !== null) {
        cancelAnimationFrame(sandRafId);
        sandRafId = null;
      }
    }



    // =============================================================
    // 🌸 4. Page 3 品牌過渡 Canvas（曼陀羅 ―― 情感的地圖）
    // =============================================================
    const brandTransitionCanvas = document.getElementById('brandTransitionCanvas');
    const brandTransitionCtx = brandTransitionCanvas.getContext('2d');
    const brandTransitionState = {
      implode: 0,
      drawProgress: 0,
      rotation: 0,
      pulse: 0,
      opacity: 1,
      scale: 1
    };

    let brandTransitionTL = null;
    let brandTransitionPulseTween = null;
    let brandTransitionParticles = [];
    let brandTransitionHoverRing = -1;
    let brandTransitionPlayToken = 0;
    let isBrandTransitionInteractive = false;
    let brandTransitionCenter = { x: 0, y: 0 };
    let brandTransitionMaxRadius = 0;

    // 原本 5 圈保持既有間距，再向外增加 3 圈。
    const BRAND_TRANSITION_BASE_RING_COUNT = 5;
    const BRAND_TRANSITION_RING_COUNT = 8;

    function resizeBrandTransitionCanvas() {
      brandTransitionCanvas.width = window.innerWidth * DPR;
      brandTransitionCanvas.height = window.innerHeight * DPR;
      brandTransitionCenter.x = brandTransitionCanvas.width * 0.5;
      brandTransitionCenter.y = brandTransitionCanvas.height * 0.4;
      // 最外圈約貼近 viewport 短邊邊框，保留完整圓形。
      brandTransitionMaxRadius =
        Math.min(brandTransitionCanvas.width, brandTransitionCanvas.height) * 0.47;
      buildBrandTransitionParticles();
    }

    function buildBrandTransitionParticles() {
      const points = [];
      const ringCount = BRAND_TRANSITION_RING_COUNT;
      const petalsPerRing = [30, 46, 62, 78, 96, 106, 116, 126];

      for (let ring = 0; ring < ringCount; ring += 1) {
        // 前 5 圈位置完全不變，第 6~8 圈沿相同間距向外延伸。
        const radius =
          brandTransitionMaxRadius *
          ((ring + 1) / BRAND_TRANSITION_BASE_RING_COUNT);
        const count = petalsPerRing[ring];

        for (let i = 0; i < count; i += 1) {
          const angle = (i / count) * Math.PI * 2;
          const lobeBoost = ring >= 7 ? 2 : (ring >= 5 ? 1 : 0);

          // 右側保留既有節奏；左側加入第二組相位波，
          // 讓花瓣有局部交疊、不再像等距規則圓環。
          const isLeftHalf = Math.cos(angle) < 0;
          const primaryWave =
            Math.sin(angle * (ring + 3 + lobeBoost)) * radius * 0.09;
          const overlapWave = isLeftHalf
            ? Math.sin(
                angle * (ring + 4 + lobeBoost) +
                ring * 0.58
              ) * radius * 0.045
            : 0;

          const targetRadius = radius + primaryWave + overlapWave;
          points.push({
            ring,
            angle,
            targetX: brandTransitionCenter.x + Math.cos(angle) * targetRadius,
            targetY: brandTransitionCenter.y + Math.sin(angle) * targetRadius,
            // P3 起始粒子覆蓋整個視窗，但不直接以矩形 x/y 均勻取樣。
            // 改用「超出視窗邊界的放射圓盤」取樣：圓盤半徑大於中心到最遠角落，
            // 因此四角也會有粒子，同時真正的分布邊界落在螢幕外，不會看到長方形或橢圓框。
            ...(() => {
              const startAngle = Math.random() * Math.PI * 2;
              const farthestX = Math.max(brandTransitionCenter.x, brandTransitionCanvas.width - brandTransitionCenter.x);
              const farthestY = Math.max(brandTransitionCenter.y, brandTransitionCanvas.height - brandTransitionCenter.y);
              const coverRadius = Math.hypot(farthestX, farthestY) * 1.16;

              // sqrt 讓圓盤面積分布自然；額外微擾避免形成規則圓環。
              const radial = Math.sqrt(Math.random()) * coverRadius;
              const jitter = (Math.random() - 0.5) * 28 * DPR;
              return {
                startX: brandTransitionCenter.x + Math.cos(startAngle) * radial + Math.cos(startAngle + Math.PI / 2) * jitter,
                startY: brandTransitionCenter.y + Math.sin(startAngle) * radial + Math.sin(startAngle + Math.PI / 2) * jitter
              };
            })(),
            size: (0.9 + Math.random() * 1.3) * DPR,
            alpha: 0.30 + Math.random() * 0.52
          });
        }
      }

      brandTransitionParticles = points;
    }

    function drawBrandTransitionFrame() {
      const ctx = brandTransitionCtx;
      const canvas = brandTransitionCanvas;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const pulseScale = 1 + Math.sin(brandTransitionState.pulse) * 0.018;
      const finalScale = brandTransitionState.scale * pulseScale;

      ctx.save();
      ctx.globalAlpha = brandTransitionState.opacity;
      ctx.translate(brandTransitionCenter.x, brandTransitionCenter.y);
      ctx.scale(finalScale, finalScale);
      ctx.rotate(brandTransitionState.rotation);
      ctx.translate(-brandTransitionCenter.x, -brandTransitionCenter.y);

      brandTransitionParticles.forEach((particle) => {
        const ringRevealStart =
          particle.ring < BRAND_TRANSITION_BASE_RING_COUNT
            ? particle.ring / 6.2
            : 0.58 + (particle.ring - BRAND_TRANSITION_BASE_RING_COUNT) * 0.055;

        const revealSpeed =
          particle.ring < BRAND_TRANSITION_BASE_RING_COUNT ? 5.6 : 4.8;

        const ringReveal = gsap.utils.clamp(
          0,
          1,
          (brandTransitionState.drawProgress - ringRevealStart) * revealSpeed
        );
        const collapseX = particle.startX + (brandTransitionCenter.x - particle.startX) * brandTransitionState.implode;
        const collapseY = particle.startY + (brandTransitionCenter.y - particle.startY) * brandTransitionState.implode;
        const x = collapseX + (particle.targetX - collapseX) * ringReveal;
        const y = collapseY + (particle.targetY - collapseY) * ringReveal;
        const highlighted = isBrandTransitionInteractive && brandTransitionHoverRing === particle.ring;

        // 收束階段刻意提高亮度與粒徑。drawProgress 尚未展開曼陀羅時，
        // 粒子不能只剩原本 15% 的可見度，否則使用者幾乎看不到「往中心聚攏」。
        const isImploding = brandTransitionState.drawProgress < 0.02;
        const gatherAlpha = Math.min(1, particle.alpha * (0.82 + brandTransitionState.implode * 0.28));
        const normalAlpha = particle.alpha * Math.max(0.15, ringReveal);
        const particleAlpha = isImploding ? gatherAlpha : normalAlpha;
        const gatherScale = isImploding ? (1.28 + brandTransitionState.implode * 0.18) : 1;

        ctx.beginPath();
        ctx.fillStyle = highlighted
          ? coralRgba('glow', Math.min(1, particle.alpha + 0.38))
          : coralRgba('deep', particleAlpha);
        ctx.shadowColor = highlighted
          ? coralRgba('glow', 0.98)
          : (isImploding ? coralRgba('light', 0.82) : coralRgba('deep', 0.45));
        ctx.shadowBlur = (highlighted ? 12 : (isImploding ? 9 : 5)) * DPR;
        ctx.arc(x, y, particle.size * gatherScale * (highlighted ? 1.5 : 1), 0, Math.PI * 2);
        ctx.fill();
      });

      // P3 核心光點：放大並在粒子收束時逐步增亮，讓「聚攏成光點」清楚可見。
      const coreRadius = (42 + brandTransitionState.implode * 24) * DPR;
      const coreAlpha = 0.58 + brandTransitionState.implode * 0.40;
      const coreGlow = ctx.createRadialGradient(
        brandTransitionCenter.x, brandTransitionCenter.y, 0,
        brandTransitionCenter.x, brandTransitionCenter.y, coreRadius
      );
      coreGlow.addColorStop(0, coralRgba('glow', coreAlpha));
      coreGlow.addColorStop(0.24, coralRgba('main', 0.72 * coreAlpha));
      coreGlow.addColorStop(0.55, coralRgba('deep', 0.38 * coreAlpha));
      coreGlow.addColorStop(1, coralRgba('deep', 0));
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(brandTransitionCenter.x, brandTransitionCenter.y, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // 收束完成時再補一顆清楚的實心核心，避免只有模糊光暈而看不到中心。
      ctx.beginPath();
      ctx.fillStyle = coralRgba('glow', 0.55 + brandTransitionState.implode * 0.43);
      ctx.shadowColor = coralRgba('light', 0.98);
      ctx.shadowBlur = (16 + brandTransitionState.implode * 18) * DPR;
      ctx.arc(brandTransitionCenter.x, brandTransitionCenter.y, (7 + brandTransitionState.implode * 5) * DPR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function animateBrandTransitionCanvas() {
      if (brandTransitionRafId !== null) return;

      const renderBrandTransitionFrame = () => {
        if (currentPageIndex !== pageElements.indexOf(document.getElementById('brandTransitionSection'))) {
          brandTransitionRafId = null;
          return;
        }
        drawBrandTransitionFrame();
        brandTransitionRafId = requestAnimationFrame(renderBrandTransitionFrame);
      };

      renderBrandTransitionFrame();
    }

    function stopBrandTransitionCanvas() {
      if (brandTransitionRafId !== null) {
        cancelAnimationFrame(brandTransitionRafId);
        brandTransitionRafId = null;
      }
    }

    function updateBrandTransitionHover(clientX, clientY) {
      if (!isBrandTransitionInteractive) return;
      const rect = brandTransitionCanvas.getBoundingClientRect();
      const x = (clientX - rect.left) * DPR;
      const y = (clientY - rect.top) * DPR;
      const distance = Math.hypot(x - brandTransitionCenter.x, y - brandTransitionCenter.y);
      const ringWidth =
        brandTransitionMaxRadius / BRAND_TRANSITION_BASE_RING_COUNT;
      const fullMandalaRadius =
        ringWidth * BRAND_TRANSITION_RING_COUNT;

      brandTransitionHoverRing = distance <= fullMandalaRadius
        ? Math.min(
            BRAND_TRANSITION_RING_COUNT - 1,
            Math.floor(distance / ringWidth)
          )
        : -1;
    }

    brandTransitionCanvas.addEventListener('pointermove', (event) => {
      updateBrandTransitionHover(event.clientX, event.clientY);
    }, { passive: true });

    brandTransitionCanvas.addEventListener('pointerleave', () => {
      brandTransitionHoverRing = -1;
    }, { passive: true });

    function addBrandTransitionTextAnimations(timeline) {
      const textLines = gsap.utils.toArray('#brandTransitionText .p3-text-line');

      textLines.forEach((line) => {
        const enterAt = Number(line.dataset.enterAt || 0);
        const partGap = Number(line.dataset.partGap || 1.5);
        const parts = gsap.utils.toArray(line.querySelectorAll('.sub-part'));

        timeline.to(
          line,
          { opacity: 1, y: 0, duration: 1, ease: 'power2.out' },
          enterAt
        );

        parts.forEach((part, partIndex) => {
          timeline.to(
            part,
            { opacity: 1, duration: 1, ease: 'power2.out' },
            enterAt + partIndex * partGap
          );
        });
      });
    }

    function resetBrandTransitionPage() {
      brandTransitionTL?.kill();
      brandTransitionPulseTween?.kill();
      brandTransitionPulseTween = null;
      gsap.killTweensOf(brandTransitionState);
      gsap.killTweensOf(
        '#brandTransitionSection .p3-text-line, #brandTransitionSection .p3-text-line .sub-part'
      );
      gsap.killTweensOf('#brandTransitionSkipBtn');

      Object.assign(brandTransitionState, {
        implode: 0,
        drawProgress: 0,
        rotation: 0,
        pulse: 0,
        opacity: 1,
        scale: 1
      });

      isBrandTransitionInteractive = false;
      brandTransitionHoverRing = -1;
      gsap.set('#brandTransitionSection .p3-text-line', { opacity: 0, y: 20 });
      gsap.set('#brandTransitionSection .p3-text-line .sub-part', { opacity: 0 });
      gsap.set('#brandTransitionSkipBtn', { opacity: 1, pointerEvents: 'auto' });
      document.getElementById('brandTransitionSkipBtn').classList.add('show');

      const arrow = document.getElementById('p3ArrowBtn');
      gsap.killTweensOf(arrow);
      arrow.dataset.animated = 'false';
      gsap.set(arrow, { opacity: 0, y: 0, pointerEvents: 'none' });
      arrow.setAttribute('aria-disabled', 'true');
    }

    function playBrandTransitionAnimation() {
      const playToken = ++brandTransitionPlayToken;
      resetBrandTransitionPage();
      setPageAnimationLock(true);

      const start = () => {
        if (playToken !== brandTransitionPlayToken) return;
        if (currentPageIndex !== pageElements.indexOf(document.getElementById('brandTransitionSection'))) return;

        document.querySelectorAll('#brandTransitionSection .p3-text-line.story-line').forEach((line) => {
          line.style.removeProperty('width');
          const finalWidth = Math.ceil(line.scrollWidth || line.getBoundingClientRect().width);
          if (finalWidth > 0) line.style.width = `${finalWidth}px`;
        });

        animateBrandTransitionCanvas();
        brandTransitionTL = gsap.timeline();

      brandTransitionTL
        .to(
          brandTransitionState,
          { implode: 1, duration: 5.3, ease: 'power2.inOut' },
          0
        )
        .to(
          brandTransitionState,
          {
            rotation: Math.PI * 0.35,
            drawProgress: 0.42,
            duration: 1.45,
            ease: 'power2.out'
          },
          5.3
        )
        .to(
          brandTransitionState,
          {
            rotation: Math.PI * 0.72,
            drawProgress: 0.82,
            duration: 1.65,
            ease: 'power1.inOut'
          },
          6.55
        )
        .to(
          brandTransitionState,
          {
            rotation: Math.PI,
            drawProgress: 1,
            duration: 1.75,
            ease: 'power1.out'
          },
          7.95
        );

      addBrandTransitionTextAnimations(brandTransitionTL);

      brandTransitionTL.call(() => {
        isBrandTransitionInteractive = true;
        setPageAnimationLock(false);

        brandTransitionPulseTween = gsap.to(brandTransitionState, {
          pulse: Math.PI * 2,
          duration: 2.8,
          repeat: -1,
          ease: 'none'
        });

        animateArrow(document.getElementById('brandTransitionSection'));

        gsap.to('#brandTransitionSkipBtn', {
          opacity: 0,
          pointerEvents: 'none',
          duration: 0.4
        });
      }, null, 10.8);
          };

      if (document.fonts?.status === 'loaded') start();
      else if (document.fonts?.ready) document.fonts.ready.then(start);
      else start();
    }

    function skipBrandTransitionAnimation() {
      if (!brandTransitionTL) return;
      brandTransitionTL.pause();
      gsap.set(brandTransitionState, { implode: 1, drawProgress: 1, rotation: Math.PI, opacity: 1, scale: 1 });
      gsap.set('#brandTransitionSection .p3-text-line', { opacity: 1, y: 0 });
      gsap.set('#brandTransitionSection .p3-text-line .sub-part', { opacity: 1 });
      isBrandTransitionInteractive = true;
      setPageAnimationLock(false);
      brandTransitionPulseTween?.kill();
      brandTransitionPulseTween = gsap.to(brandTransitionState, {
        pulse: Math.PI * 2,
        duration: 2.8,
        repeat: -1,
        ease: 'none'
      });
      animateArrow(document.getElementById('brandTransitionSection'));
      gsap.to('#brandTransitionSkipBtn', { opacity: 0, pointerEvents: 'none', duration: 0.4 });
    }

    function leaveBrandTransitionPage() {
      brandTransitionPlayToken += 1;
      setPageAnimationLock(false);
      isBrandTransitionInteractive = false;
      brandTransitionTL?.kill();
      brandTransitionPulseTween?.kill();
      brandTransitionPulseTween = null;
      gsap.to(brandTransitionState, {
        scale: 1.08,
        opacity: 0.25,
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: stopBrandTransitionCanvas
      });
    }


    // =============================================================
    // ✦ 5. Page 4 AI 重現與感官體驗
    // =============================================================
    const aiReconstructionSection = document.getElementById('aiReconstructionSection');
    const p4CardsContainer = document.getElementById('p4Cards');
    const p4Cards = gsap.utils.toArray('#aiReconstructionSection .p4-card-item');
    const p4VisualCanvas = document.getElementById('p4VisualCanvas');
    const p4VisualCtx = p4VisualCanvas.getContext('2d');
    const p4MemoryCanvas = document.getElementById('p4MemoryCanvas');
    const p4MemoryCtx = p4MemoryCanvas.getContext('2d');
    const p4TouchCanvas = document.getElementById('p4TouchCanvas');
    const p4TouchCtx = p4TouchCanvas.getContext('2d');

    // P4 背景｜坡形線條 Canvas
    const p4TerrainCanvas = document.getElementById('p4TerrainBackdrop');
    const p4TerrainCtx = p4TerrainCanvas.getContext('2d');

    const P4_TERRAIN_LINE_COUNT = 45;
    const P4_TERRAIN_DPR_MAX = 1.5;

    let p4TerrainRafId = null;
    let p4TerrainStartTime = 0;
    let p4TerrainFeatures = [];

    let page4TL = null;
    let isP4Interactive = false;
    let activeP4Card = null;
    let p4VisualTime = 0;
    let p4MemoryPointer = { x: 0.5, y: 0.5 };
    let p4MemoryParticles = [];


    function p4TerrainBump(value, center, spread) {
      const d = (value - center) / spread;
      return Math.exp(-(d * d));
    }

    function p4TerrainLocalFeature(px, depth, feature) {
      const nx = (px - feature.x) / feature.sizeX;
      const ny = (depth - feature.y) / feature.sizeY;
      const r2 = nx * nx + ny * ny;
      return Math.exp(-Math.pow(r2, feature.power)) * feature.amplitude;
    }

    function buildP4TerrainFeatures() {
      /*
        P4 隨機局部地形｜2026-08-16
        -------------------------------------------------------------
        改為「只有突出地面的小山丘」，不再生成凹陷／坑洞。

        注意座標方向：
        drawP4TerrainFrame() 最後使用：
          y = baseY + deformation

        所以：
        - amplitude < 0 ＝ 線條往上凸 ＝ 小山丘
        - amplitude > 0 ＝ 線條往下凹 ＝ 坑洞

        因此這裡所有 feature amplitude 都固定為負值。
        每次進 P4 仍重新配置，停留同一頁期間則固定不跳動。
      */
      const features = [
        // 大型山丘 1
        {
          x: 0.27 + Math.random() * 0.10,
          y: 0.42 + Math.random() * 0.16,
          sizeX: 0.060 + Math.random() * 0.025,
          sizeY: 0.13 + Math.random() * 0.055,
          amplitude: -(0.046 + Math.random() * 0.018),
          power: 1.35
        },

        // 大型山丘 2
        {
          x: 0.64 + Math.random() * 0.13,
          y: 0.48 + Math.random() * 0.18,
          sizeX: 0.052 + Math.random() * 0.025,
          sizeY: 0.11 + Math.random() * 0.060,
          amplitude: -(0.040 + Math.random() * 0.018),
          power: 1.45
        }
      ];

      // 再加 0～2 個較小山丘，總數維持 2～4 個。
      const extraCount =
        Math.floor(
          Math.random() * 3
        );

      for (
        let i = 0;
        i < extraCount;
        i += 1
      ) {
        features.push({
          x: 0.12 + Math.random() * 0.76,
          y: 0.22 + Math.random() * 0.62,
          sizeX: 0.020 + Math.random() * 0.032,
          sizeY: 0.052 + Math.random() * 0.070,

          // 永遠為負值：只往上凸，不再往下凹。
          amplitude:
            -(
              0.018 +
              Math.random() * 0.025
            ),

          power:
            1.48 +
            Math.random() * 0.42
        });
      }

      p4TerrainFeatures =
        features;
    }

    function p4TerrainShape(px, depth, time) {
      /*
        P4 基礎坡面：
        - 原本大型坡形保留。
        - 額外疊一層低頻、平滑的波浪，讓底層不再像平面。
        - 局部小山丘獨立維持 1.80 倍，不再被基礎波浪倍率影響。
      */
      const broad =
        Math.sin(px * Math.PI * 3.05 + time) * 0.013;

      const broadHill1 =
        -p4TerrainBump(px, 0.30, 0.12) * 0.015;

      const broadHill2 =
        -p4TerrainBump(px, 0.72, 0.14) * 0.013;

      const broadValley1 =
        p4TerrainBump(px, 0.50, 0.095) * 0.0125;

      const broadValley2 =
        p4TerrainBump(px, 0.11, 0.10) * 0.008;

      const depthWave =
        Math.sin(
          px * Math.PI * 4.15 -
          depth * 2.3 +
          time * 0.55
        ) *
        0.024 *
        depth *
        (1 - depth * 0.28);

      const secondary =
        Math.sin(
          px * Math.PI * 1.65 +
          depth * 3.0 -
          time * 0.32
        ) *
        0.005 *
        depth;

      /*
        新增「底層平面波浪」：
        低頻、長波長，只有緩升緩降，不形成新的局部坑洞。
        depth 有些微相位差，所以 45 條線不會完全平行複製。
      */
      const baseWave =
        Math.sin(
          px * Math.PI * 2 * 1.12 +
          depth * 0.82 -
          time * 0.22
        ) *
        0.0135;

      const baseWave2 =
        Math.sin(
          px * Math.PI * 2 * 0.56 -
          depth * 0.46 +
          time * 0.12
        ) *
        0.007;

      let local = 0;
      for (const feature of p4TerrainFeatures) {
        local += p4TerrainLocalFeature(px, depth, feature);
      }

      // 局部小山丘維持使用者指定的 1.80 倍。
      local *= 1.80;

      const micro =
        Math.sin(px * Math.PI * 10.5 + depth * 5.8 + time * 0.16) *
        Math.sin(px * Math.PI * 4.7 - depth * 3.7) *
        0.0013 *
        (0.30 + depth * 0.70);

      return (
        broad +
        broadHill1 +
        broadHill2 +
        broadValley1 +
        broadValley2 +
        depthWave +
        secondary +
        baseWave +
        baseWave2 +
        local +
        micro
      );
    }

    function resizeP4TerrainCanvas() {
      const rect = aiReconstructionSection.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, P4_TERRAIN_DPR_MAX);

      p4TerrainCanvas.width = Math.max(1, Math.round(rect.width * dpr));
      p4TerrainCanvas.height = Math.max(1, Math.round(rect.height * dpr));
      p4TerrainCanvas.style.width = `${rect.width}px`;
      p4TerrainCanvas.style.height = `${rect.height}px`;

      p4TerrainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawP4TerrainFrame(timestamp = performance.now()) {
      const rect = aiReconstructionSection.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;

      if (!W || !H) return;

      const ctx = p4TerrainCtx;
      const elapsed = timestamp - p4TerrainStartTime;
      const time = elapsed * 0.000085;

      ctx.clearRect(0, 0, W, H);

      // 整個坡形背景往下移：
      // 約前 3/4 線條留在畫面內，最下方約 1/4 自然超出 viewport。
      const topY = H * 0.64;
      const bottomY = H * 1.14;
      const span = bottomY - topY;
      const samples = Math.max(150, Math.floor(W / 10));

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // ---------------------------------------------------------
      // P1 式金色掃光：由最上層線條往最下層移動
      // 尾端使用 crossfade，避免回到第一圈時出現跳格。
      // ---------------------------------------------------------
      const glowProgress = ((elapsed * 0.000055) % 1 + 1) % 1;
      const glowLine = glowProgress * (P4_TERRAIN_LINE_COUNT - 1);

      const crossRange = 0.14;
      const crossT = Math.max(
        0,
        Math.min(
          1,
          (glowProgress - (1 - crossRange)) / crossRange
        )
      );
      const smoothCross = crossT * crossT * (3 - 2 * crossT);
      const currentFade = 1 - smoothCross;
      const nextFade = smoothCross;

      for (let i = 0; i < P4_TERRAIN_LINE_COUNT; i += 1) {
        const depth = i / (P4_TERRAIN_LINE_COUNT - 1);
        const easedDepth = Math.pow(depth, 1.16);
        const baseY = topY + easedDepth * span;

        const normalAlpha = 0.16 + depth * 0.22;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(205, 193, 181, ${normalAlpha})`;
        ctx.lineWidth = 0.82;

        const points = [];

        for (let s = 0; s <= samples; s += 1) {
          const px = s / samples;
          const x = px * W;

          const deformation =
            p4TerrainShape(px, depth, time) *
            H *
            (0.62 + depth * 0.72);

          const y = baseY + deformation;
          points.push([x, y]);

          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();

        // 本輪掃光
        const currentDistance = Math.abs(i - glowLine);
        const currentGlow =
          Math.max(0, 1 - currentDistance / 2.35) *
          currentFade;

        // 下一輪最上層提前淡入
        const nextDistance = Math.abs(i - 0);
        const nextGlow =
          Math.max(0, 1 - nextDistance / 2.35) *
          nextFade;

        const glow = Math.max(currentGlow, nextGlow);

        if (glow > 0) {
          ctx.save();
          ctx.beginPath();

          for (let p = 0; p < points.length; p += 1) {
            const [x, y] = points[p];
            if (p === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          // 清楚的金色核心線 + 小範圍柔光，
          // 視覺語言比照洸語牆樹的流光。
          ctx.strokeStyle =
            coralRgba('light', 0.24 + glow * 0.62);

          ctx.lineWidth =
            1.05 + glow * 0.48;

          ctx.shadowColor =
            coralRgba('main', 0.16 + glow * 0.38);

          ctx.shadowBlur =
            2.5 + glow * 5.5;
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    function renderP4Terrain(timestamp) {
      if (
        currentPageIndex !== pageElements.indexOf(aiReconstructionSection)
      ) {
        p4TerrainRafId = null;
        return;
      }

      drawP4TerrainFrame(timestamp);
      p4TerrainRafId = requestAnimationFrame(renderP4Terrain);
    }

    function startP4Terrain() {
      stopP4Terrain();

      if (!p4TerrainFeatures.length) {
        buildP4TerrainFeatures();
      }

      resizeP4TerrainCanvas();
      p4TerrainStartTime = performance.now();
      drawP4TerrainFrame(p4TerrainStartTime);
      p4TerrainRafId = requestAnimationFrame(renderP4Terrain);
    }

    function stopP4Terrain() {
      if (p4TerrainRafId !== null) {
        cancelAnimationFrame(p4TerrainRafId);
        p4TerrainRafId = null;
      }
    }

    function resizeP4Canvases() {
      resizeP4TerrainCanvas();

      [p4VisualCanvas, p4MemoryCanvas, p4TouchCanvas].forEach((canvas) => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(rect.width * DPR));
        canvas.height = Math.max(1, Math.round(rect.height * DPR));
      });
      buildP4MemoryParticles();
      drawP4VisualFrame();
      drawP4MemoryFrame();
      drawP4TouchFrame();
    }

    function buildP4MemoryParticles() {
      p4MemoryParticles = [];
      const ringCounts = [16, 20, 24, 28, 32];
      ringCounts.forEach((count, ringIndex) => {
        for (let i = 0; i < count; i += 1) {
          p4MemoryParticles.push({
            ring: ringIndex,
            angle: (i / count) * Math.PI * 2,
            phase: Math.random() * Math.PI * 2,
            size: .82 + (ringIndex % 2) * .16
          });
        }
      });
    }

    function drawP4VisualFrame() {
      const ctx = p4VisualCtx;
      const w = p4VisualCanvas.width;
      const h = p4VisualCanvas.height;
      if (!w || !h) return;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      const visualActive = activeP4Card === 'visual';

      // Hover / Active 時大幅增加旋轉角度與移動距離。
      // 預設維持輕微呼吸；靠近後才有明顯動態。
      const visualSwing = visualActive ? 1 : .18;
      const moveX = Math.sin(p4VisualTime * .92) * (visualActive ? 18 * DPR : 2 * DPR);
      const moveY = Math.cos(p4VisualTime * .68) * (visualActive ? 9 * DPR : 1.5 * DPR);
      ctx.translate(moveX, moveY);
      ctx.rotate(Math.sin(p4VisualTime * .78) * .28 * visualSwing);

      ctx.strokeStyle = coralRgba('main', .84);
      ctx.lineWidth = Math.max(1.1, 1.2 * DPR);
      ctx.shadowColor = coralRgba('main', .22);
      ctx.shadowBlur = 4 * DPR;

      const petals = 12;
      const centerR = Math.min(w, h) * .065;
      const outerR = Math.min(w, h) * .34;
      const petalW = Math.min(w, h) * .11;
      const breathe = 1 + Math.sin(p4VisualTime * 1.08) * .025;

      for (let i = 0; i < petals; i += 1) {
        const angle = (i / petals) * Math.PI * 2;
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(centerR, 0);
        ctx.bezierCurveTo(
          outerR * .42, -petalW,
          outerR * .83, -petalW * .72,
          outerR * breathe, 0
        );
        ctx.bezierCurveTo(
          outerR * .83, petalW * .72,
          outerR * .42, petalW,
          centerR, 0
        );
        ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      for (let i = 0; i <= 48; i += 1) {
        const a = (i / 48) * Math.PI * 2;
        const rr = centerR * (.86 + .13 * Math.sin(a * 6 + p4VisualTime));
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    function drawP4TouchFrame(timestamp = performance.now()) {
      const ctx = p4TouchCtx;
      const w = p4TouchCanvas.width;
      const h = p4TouchCanvas.height;
      if (!w || !h) return;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);

      const isMobile = window.innerWidth <= 768;
      const active = activeP4Card === 'touch';

      // 參考圖核心特徵：
      // 1. 中央明確空心，不允許線條進入。
      // 2. 外圍線條由外往內、逆時針收束。
      // 3. 線條彼此交疊，但中心仍維持乾淨留白。
      const base = Math.min(w, h);
      const innerHole = base * .115;
      const outerR = base * .39;

      const strands = 8;
      const steps = isMobile ? 34 : 46;

      // Hover 後仍是慢速呼吸，但不改變幾何結構。
      // 旋渦線本身不再整體呼吸，保持穩定清楚。
      const breath = 1;

      ctx.strokeStyle = coralRgba('main', .90 * breath);
      ctx.lineWidth = Math.max(1.75 * DPR, 1.75);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = coralRgba('main', active ? .24 : .15);
      ctx.shadowBlur = active ? 4 * DPR : 2 * DPR;

      /*
        每一條線從外圈開始，沿逆時針方向逐步向內收。
        收束到 innerHole 外緣就停止，因此中心永遠保持空白。
      */
      for (let i = 0; i < strands; i += 1) {
        const baseAngle = (i / strands) * Math.PI * 2;

        ctx.beginPath();

        for (let s = 0; s <= steps; s += 1) {
          const t = s / steps;

          // 外 -> 內
          const radius =
            outerR - (outerR - innerHole) * Math.pow(t, .94);

          // 逆時針往內旋轉。
          // 越接近中心，旋轉量越多，形成明顯交疊漩渦。
          const angle =
            baseAngle -
            (Math.PI * 1.55) * Math.pow(t, 1.08) -
            0.10 * Math.sin(t * Math.PI);

          // 輕微橢圓變形，避免太像數學完美圓環。
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius * .94;

          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
      }

      // 中央遮罩：保證任何 antialias / shadow 都不會侵入空心區。
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(0, 0, innerHole * .96, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';

      // 空心邊緣僅保留非常淡的暖光，不畫實線圓框。
      const rim = ctx.createRadialGradient(
        0, 0, innerHole * .78,
        0, 0, innerHole * 1.28
      );
      rim.addColorStop(0, coralRgba('main', 0));
      rim.addColorStop(.62, coralRgba('main', active ? .045 * breath : .025));
      rim.addColorStop(1, coralRgba('main', 0));
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(0, 0, innerHole * 1.28, 0, Math.PI * 2);
      ctx.fill();


      /*
        Hover / Active 時的觸覺微光：
        不再讓整個旋渦一起明暗，而是在框內分布多個金色光點，
        每顆使用不同 phase / speed 隨機感亮起與暗掉。
        使用數學固定種子，不需要建立額外 DOM 或第二套 RAF。
      */
      const sparkleCount = isMobile ? 18 : 28;
      const sparkleAreaX = Math.min(w * .42, outerR * 1.55);
      const sparkleAreaY = Math.min(h * .40, outerR * 1.25);

      for (let i = 0; i < sparkleCount; i += 1) {
        // deterministic pseudo-random position
        const seedA = Math.sin((i + 1) * 12.9898) * 43758.5453;
        const seedB = Math.sin((i + 1) * 78.233) * 12345.6789;
        const seedC = Math.sin((i + 1) * 39.425) * 24680.1357;

        const randA = seedA - Math.floor(seedA);
        const randB = seedB - Math.floor(seedB);
        const randC = seedC - Math.floor(seedC);

        const px = (randA * 2 - 1) * sparkleAreaX;
        const py = (randB * 2 - 1) * sparkleAreaY;

        // 中央空心區不要出現光點
        if (Math.hypot(px, py) < innerHole * 1.20) continue;

        const speed = .0010 + randC * .0017;
        const phase = randA * Math.PI * 4 + randB * Math.PI * 2;
        const wave = 0.5 + 0.5 * Math.sin(timestamp * speed + phase);

        // 非 Hover 時只留極淡環境光；Hover 後才明顯隨機閃爍
        const alpha = active
          ? .08 + Math.pow(wave, 2.2) * .72
          : .035 + Math.pow(wave, 2.4) * .12;

        const radius = (1.0 + randC * 1.8) * DPR;

        ctx.beginPath();
        ctx.fillStyle = coralRgba('light', alpha);
        ctx.shadowColor = coralRgba('main', alpha * .7);
        ctx.shadowBlur = (active ? 4.5 : 2) * DPR;
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function renderP4Visual() {
      if (p4VisualRafId !== null) return;
      const frame = () => {
        if (currentPageIndex !== pageElements.indexOf(aiReconstructionSection) || activeP4Card !== 'visual') {
          p4VisualRafId = null;
          return;
        }
        p4VisualTime += .025;
        drawP4VisualFrame();
        p4VisualRafId = requestAnimationFrame(frame);
      };
      p4VisualRafId = requestAnimationFrame(frame);
    }

    function renderP4Touch(timestamp) {
      if (p4TouchRafId === null) return;
      if (currentPageIndex !== pageElements.indexOf(aiReconstructionSection) || activeP4Card !== 'touch') {
        p4TouchRafId = null;
        return;
      }
      drawP4TouchFrame(timestamp);
      p4TouchRafId = requestAnimationFrame(renderP4Touch);
    }

    function stopP4Visual() {
      if (p4VisualRafId !== null) cancelAnimationFrame(p4VisualRafId);
      p4VisualRafId = null;
    }

    function drawP4MemoryFrame() {
      const ctx = p4MemoryCtx;
      const w = p4MemoryCanvas.width;
      const h = p4MemoryCanvas.height;
      if (!w || !h) return;

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * .34;
      const pointerX = p4MemoryPointer.x * w;
      const pointerY = p4MemoryPointer.y * h;

      p4MemoryParticles.forEach((particle) => {
        const radius = maxR * ((particle.ring + 1) / 5);
        let px = cx + Math.cos(particle.angle) * radius;
        let py = cy + Math.sin(particle.angle) * radius;

        const dx = px - pointerX;
        const dy = py - pointerY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const influence = Math.max(0, 1 - distance / (95 * DPR));
        px += (dx / distance) * influence * 18 * DPR;
        py += (dy / distance) * influence * 18 * DPR;

        ctx.beginPath();
        ctx.fillStyle = coralRgba('main', .55 + .16 * Math.sin(particle.phase));
        ctx.shadowColor = coralRgba('main', .20);
        ctx.shadowBlur = 2 * DPR;
        ctx.arc(px, py, particle.size * DPR, 0, Math.PI * 2);
        ctx.fill();
        particle.phase += .025;
      });
    }

    function renderP4Memory() {
      if (p4MemoryRafId !== null) return;
      const frame = () => {
        if (currentPageIndex !== pageElements.indexOf(aiReconstructionSection) || activeP4Card !== 'memory') {
          p4MemoryRafId = null;
          return;
        }
        drawP4MemoryFrame();
        p4MemoryRafId = requestAnimationFrame(frame);
      };
      p4MemoryRafId = requestAnimationFrame(frame);
    }

    function stopP4Memory() {
      if (p4MemoryRafId !== null) cancelAnimationFrame(p4MemoryRafId);
      p4MemoryRafId = null;
    }

    function stopP4Canvases() {
      stopP4Visual();
      stopP4Memory();
      if (p4TouchRafId !== null) cancelAnimationFrame(p4TouchRafId);
      p4TouchRafId = null;
    }

    function focusP4Card(card) {
      if (!isP4Interactive || !card) return;
      activeP4Card = card.dataset.p4Card;
      p4CardsContainer.classList.add('has-focus');
      p4Cards.forEach((item) => item.classList.toggle('is-active', item === card));
      gsap.to(card, { scale: 1.03, duration: .35, ease: 'power2.out', overwrite: true });
      p4Cards.filter((item) => item !== card).forEach((item) => gsap.to(item, { scale: 1, duration: .3, overwrite: true }));
      stopP4Canvases();
      if (activeP4Card === 'visual') renderP4Visual();
      if (activeP4Card === 'memory') renderP4Memory();
      if (activeP4Card === 'touch') {
        p4TouchRafId = requestAnimationFrame(renderP4Touch);
      }
    }

    function clearP4CardFocus() {
      activeP4Card = null;
      p4CardsContainer.classList.remove('has-focus');
      p4Cards.forEach((item) => {
        item.classList.remove('is-active');
        gsap.to(item, { scale: 1, duration: .3, overwrite: true });
      });
      stopP4Canvases();
      drawP4TouchFrame();
    }

    p4Cards.forEach((card) => {
      card.addEventListener('mouseenter', () => focusP4Card(card));
      card.addEventListener('focus', () => focusP4Card(card));
      card.addEventListener('click', () => focusP4Card(card));
      card.addEventListener('mouseleave', () => {
        if (!card.matches(':focus')) clearP4CardFocus();
      });
      card.addEventListener('blur', clearP4CardFocus);
    });

    p4MemoryCanvas.closest('.p4-card-item').addEventListener('pointermove', (event) => {
      const rect = p4MemoryCanvas.getBoundingClientRect();
      p4MemoryPointer.x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      p4MemoryPointer.y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    });

    function resetP4State() {
      page4TL?.kill();
      stopP4Canvases();
      stopP4Terrain();
      clearP4CardFocus();
      isP4Interactive = false;
      gsap.killTweensOf('#aiReconstructionSection *');
      gsap.set('#aiReconstructionSection .p4-header-line', { autoAlpha: 0, y: 20 });
      gsap.set(p4Cards, { autoAlpha: 0, y: 35, scale: .95 });
      gsap.set('#aiReconstructionSection .p4-footer-text', { opacity: 0, y: 20 });
      const arrow = document.getElementById('p4ArrowBtn');
      gsap.killTweensOf(arrow);
      arrow.dataset.animated = 'false';
      gsap.set(arrow, { opacity: 0, y: 0, pointerEvents: 'none' });
      arrow.setAttribute('aria-disabled', 'true');
      gsap.set('#aiReconstructionSkipBtn', { opacity: 1, pointerEvents: 'auto' });
    }

    function enableP4Interaction() {
      isP4Interactive = true;
      setPageAnimationLock(false);
      gsap.to('#aiReconstructionSkipBtn', { opacity: 0, pointerEvents: 'none', duration: .4 });
    }

    function playP4Animation() {
      resetP4State();

      // 每次進入 P4 重新產生 2~4 個局部小山丘，停留期間固定。
      buildP4TerrainFeatures();
      startP4Terrain();

      setPageAnimationLock(true);
      const p4HeaderLines = gsap.utils.toArray('#aiReconstructionSection .p4-header-line');

      page4TL = gsap.timeline();
      page4TL
        .to(p4HeaderLines[0], { autoAlpha: 1, y: 0, duration: 1.0, ease: 'power2.out' }, 1.7)
        .to(p4HeaderLines[1], { autoAlpha: 1, y: 0, duration: 1.0, ease: 'power2.out' }, 3.2)
        .to(p4Cards, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: .8,
          stagger: .22,
          ease: 'power2.out'
        }, 4.4)
        .to('#aiReconstructionSection .p4-footer-text', { opacity: 1, y: 0, duration: .8, ease: 'power2.out' }, 6.15)
        .call(enableP4Interaction, null, 7.0)
        .call(() => animateArrow(aiReconstructionSection), null, 7.3);
    }

    function skipP4Animation() {
      page4TL?.pause();

      if (p4TerrainRafId === null) {
        startP4Terrain();
      }
      gsap.set('#aiReconstructionSection .p4-header-line, #aiReconstructionSection .p4-footer-text', { autoAlpha: 1, y: 0 });
      gsap.set(p4Cards, { autoAlpha: 1, y: 0, scale: 1 });
      enableP4Interaction();
      animateArrow(aiReconstructionSection);
    }

    function leaveP4Page() {
      setPageAnimationLock(false);
      page4TL?.kill();
      isP4Interactive = false;
      clearP4CardFocus();
      stopP4Canvases();
      stopP4Terrain();
      gsap.to('#aiReconstructionSection .p4-card-item', {
        opacity: 0,
        y: 20,
        duration: .6,
        stagger: .08,
        ease: 'power2.inOut'
      });
    }


    // =============================================================


    // =============================================================
    // 7. 品牌故事頁｜獨立地平線 / 波紋 Canvas
    // -------------------------------------------------------------
    // 參考視覺：
    // - 上方深色空間
    // - 左上微弱暖色 / 冷色霧光
    // - 低位地平線
    // - 下方密集水平線條與局部凹陷 / 隆起
    //
    // 與 P1 mandalaCanvas 完全獨立。
    // =============================================================
    const brandStoryCanvas =
      document.getElementById('brandStoryCanvas');

    const brandStoryCtx =
      brandStoryCanvas?.getContext('2d');

    let brandStoryRafId = null;
    let isBrandStoryCanvasRunning = false;
    let brandStoryLastFrame = 0;

    function resizeBrandStoryCanvas() {
      if (!brandStoryCanvas || !brandStoryCtx) return;

      const rect =
        brandStoryCanvas.getBoundingClientRect();

      const cssWidth =
        Math.max(1, rect.width || window.innerWidth);

      const cssHeight =
        Math.max(1, rect.height || window.innerHeight);

      brandStoryCanvas.width =
        Math.round(cssWidth * DPR);

      brandStoryCanvas.height =
        Math.round(cssHeight * DPR);
    }

    function brandStoryGaussian(
      x,
      center,
      width
    ) {
      const d =
        (x - center) / width;

      return Math.exp(
        -(d * d) * 2.2
      );
    }

    function drawBrandStoryLandscape(
      time = 0
    ) {
      if (!brandStoryCanvas || !brandStoryCtx) return;

      const ctx = brandStoryCtx;
      const w = brandStoryCanvas.width;
      const h = brandStoryCanvas.height;

      ctx.clearRect(0, 0, w, h);

      // 背景
      ctx.fillStyle = '#242424';
      ctx.fillRect(0, 0, w, h);

      // 左上極淡霧光：只提供參考圖中的空間層次。
      const glowX = w * .255;
      const glowY = h * .245;
      const glowR = Math.max(w, h) * .31;

      const glow =
        ctx.createRadialGradient(
          glowX,
          glowY,
          0,
          glowX,
          glowY,
          glowR
        );

      glow.addColorStop(
        0,
        'rgba(255,176,136,.055)'
      );
      glow.addColorStop(
        .35,
        'rgba(111,140,128,.030)'
      );
      glow.addColorStop(
        1,
        'rgba(36,36,36,0)'
      );

      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // 水平線區約佔底部 2/7，地平線位於畫面 5/7 高度。
      const horizonY = h * (5 / 7);

      // 地平線
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.strokeStyle =
        'rgba(230,230,232,.34)';
      ctx.lineWidth = 1.05 * DPR;
      ctx.stroke();

      // 水平地景線
      const lineCount = 58;
      const sampleCount = 110;
      const slowPhase = time * .00011;

      for (
        let row = 0;
        row < lineCount;
        row += 1
      ) {
        const t =
          row / (lineCount - 1);

        // 越靠近畫面底部，線距逐漸拉開。
        const baseY =
          horizonY +
          Math.pow(t, 1.43) *
          (h - horizonY + 14 * DPR);

        ctx.beginPath();

        for (
          let i = 0;
          i <= sampleCount;
          i += 1
        ) {
          const nx =
            i / sampleCount;

          const x =
            nx * w;

          // 品牌故事地面完全水平，不再產生凹陷、隆起或波浪。
          const y = baseY;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        const coralLine =
          row === 12 ||
          row === 34 ||
          row === 50;

        ctx.strokeStyle =
          coralLine
            ? 'rgba(255,176,136,.23)'
            : `rgba(230,230,232,${
                0.18 + t * .28
              })`;

        // 平面維持水平，只讓線條粗細交錯。
        const thicknessPattern = [0.58, 0.82, 0.66, 1.08, 0.72, 0.92][row % 6];
        ctx.lineWidth = (thicknessPattern + t * .16) * DPR;

        ctx.stroke();
      }
    }

    function renderBrandStoryCanvas(
      timestamp = 0
    ) {
      if (!isBrandStoryCanvasRunning) {
        brandStoryRafId = null;
        return;
      }

      // 約 30fps 即可，降低 GPU 負擔。
      if (
        timestamp -
        brandStoryLastFrame >=
        32
      ) {
        drawBrandStoryLandscape(
          timestamp
        );

        brandStoryLastFrame =
          timestamp;
      }

      brandStoryRafId =
        requestAnimationFrame(
          renderBrandStoryCanvas
        );
    }

    function startBrandStoryCanvas() {
      if (!brandStoryCanvas) return;

      resizeBrandStoryCanvas();

      isBrandStoryCanvasRunning =
        true;

      if (brandStoryRafId === null) {
        brandStoryRafId =
          requestAnimationFrame(
            renderBrandStoryCanvas
          );
      }
    }

    function stopBrandStoryCanvas() {
      isBrandStoryCanvasRunning =
        false;

      if (brandStoryRafId !== null) {
        cancelAnimationFrame(
          brandStoryRafId
        );

        brandStoryRafId = null;
      }
    }
