# 2026-08-16｜品牌故事相機柔焦 V11

本次只需要替換 3 個網站檔案：

- `css/style.css`
- `css/mobile-fixes.css`
- `js/animations.js`

## 調整方向

V10 的水波紋已整組移除。

改成「相機景深 / 對焦」概念：

```text
框內 slogan ＝ 焦點，保持完全清楚
框外近距離 ＝ 輕微柔焦
框外遠距離 ＝ 更強柔焦
```

## 桌機

只有最後兩句 slogan 與左右括號完整出現後才啟用互動。

滑鼠進入：

```text
［ 因為有限　所以珍惜
   因為記得　所以重逢 ］
```

這個框內時：

- 框內完全保持清楚
- 框外開始柔焦
- 第一層約 2.4px blur
- 更外圍再疊一層約 6.8px blur
- 因此越遠離 slogan，視覺越模糊

滑鼠離開框內：

- 約 0.55 秒柔和恢復正常
- 不需要點擊

## 手機 / 平板

手機沒有 hover。

因此：

- 點擊／觸碰 slogan 框內 → 啟用柔焦
- 約 2.8 秒後自動恢復
- 手機柔焦稍微降低：
  - 近區約 1.8px
  - 遠區約 5.2px

## 清晰範圍

JS 會用 `getBoundingClientRect()` 取得實際 slogan / bracket 尺寸，
所以不是寫死固定位置。

這可以避免：

- 平板換行後清晰框位置錯誤
- 手機字級不同後焦點區偏移
- 桌機不同解析度時 bracket 與 clear zone 對不上

## Skip

按品牌故事 Skip：

- 直接進入最後 slogan 狀態
- 同時開放柔焦互動
- 但不會自動觸發柔焦，仍需 hover / touch

## 離開頁面

離開品牌故事頁時：

- 關閉 focus 狀態
- 清除手機自動恢復 timer
- 再次進頁重新等待 slogan 完成後才開放互動

## 檢查

`animations.js` 已通過 Node syntax check。
