# CMS Prototype 架構

## 內容層
P1 使用固定 key：
- p1.question_01_part_01
- p1.question_01_part_02
- p1.question_02_part_01
- p1.question_02_part_02
- p1.question_03_part_01
- p1.question_03_part_02

HTML 只增加 data-content-key。既有動畫 class 不變。

## 正式資料庫建議
site_content:
- content_key
- page_key
- label
- content_type
- draft_value
- published_value
- updated_at
- updated_by

content_history:
- 保存發布版本

animation_settings（未來可選）：
- p1.glow.speed
- p1.ring.count
- p3.mandala.rings
- p4.terrain.amplitude
- p5.horn.drift_duration

動畫設定不要和 site_content 混在一起。

## 動畫重製為何不影響 CMS
CMS 只找 data-content-key 並填文字。GSAP、Canvas、SVG、CSS 可以重寫。
只要該文字 DOM 還存在、key 不變，CMS 就不受影響。
