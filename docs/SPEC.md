# 潮汐场 TIDAL ARENA —— 方案重建规格书（v3）

> 本文件是**唯一设计契约**。所有并行工作都必须遵守本文件定义的造型语言、模块边界与 API。
> 项目根目录：`D:\Desktop\世界杯3d`。静态服务已由用户启动：**http://127.0.0.1:8099**（勿自行起服务）。
> 浏览器（Playwright）路径：`C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe`
> 测试脚本放在 `tools/`，截图输出到 `tools/shots/`。

---

## 0. v3 变更摘要

> 完整改动记录与复现命令见 `docs/CHANGELOG-v3.md`。

- **容量真源统一**：总座 **80,952**（≥ 80,000）。逐排逐区求和 = 座椅实例数 = 仪表读数 = 疏散总量，四者同源。
- **徽章/目标系统重写**：徽章位置由 `rings.pt()` 推导，任务判定改用体育场自身 `(s, y, u)` 坐标（不再用世界 `x/z`）。
- **疏散演练策略化**：12 出口（4 主 + 8 次）+ **10 组人力预算** + 110s 时限 + 实时排队/压力反馈 + 3D 闸口状态牌 + S/A/B/C/D 评级 + 真实失败态。
- **成长回路**：等级解锁真实能力（Lv2 黄昏 / Lv3 滤镜+构图评分 / Lv4 应急广播 / Lv5 建筑洞察图鉴）。
- **建筑洞察图鉴**：12 处建筑细节热点，走近 5m 收录 +8 XP，HUD 面板可查。
- **开场简报**：3 步玩法 + 当前目标，`B` 键重开，首次进入自动弹出（localStorage 记忆）。

---

## 1. 造型概念（必须遵守，不得自行改形）

**"四潮八柱·鞍面悬浮"**

- **鞍面屋盖**：屋盖是一个连续的单层曲面环带，四边中部高、四角低（沿环向做余弦调制），
  内檐是一条细薄的悬浮边（≤1.3m 厚，带金属收边与连续灯带），外檐压在外立面顶部。
  场地正上方**完全开敞**（内檐 s≥24m，透光可见天空）。屋盖内外均可见**径向桁架**。
- **八根潮柱**：8 根倾斜（外倾 8°）的清水混凝土柱＋钢节点，从 ±z、±x 四边中部与四角
  落在广场基座上，是屋盖的主要竖向支撑（结构可读：柱→环梁→径向桁架→檩条→面板）。
- **三道潮线立面**：外立面由 3 道连续的水平铝带（含夜间灯带）分为 4 段；
  下段为**清水混凝土基座**（带 4 个 24m 高主入口券洞 + 8 个次入口），
  中上段为**青铜色金属网幕墙 + 深色玻璃**，背后透出环廊内光。
- **色彩**：象牙白 `#EDE8DE` / 石灰灰 `#B9B3A8` / 青铜 `#8C7A5E` / 深青 `#1B3B47` /
  夜间灯带青金 `#6FD3E0` 与暖白 `#FFE9C9`。
- **场地**：105×68 天然草，无跑道；四角 4 组灯桥（挂屋盖内檐下）；LED 广告板围合。

## 2. 模块边界与文件所有权（严格，勿越界）

| 归属 | 文件 |
|---|---|
| **LEAD（不得由他人修改）** | `src/app.js`、`src/lib/core.js`、`src/lib/sections.js`、`src/lib/rings.js`、`src/lib/seats.js`、`src/scenes/arena.js`、`docs/*` |
| **site（T1）** | `src/scenes/env.js`、`src/scenes/sky.js`、`src/lib/textures.js` |
| **hud（T2）** | `index.html`、`styles.css`、`src/ui.js` |
| **play（T3）** | `src/lib/walk.js`、`src/lib/orbit.js`、`src/lib/modes.js`、`src/lib/postfx.js`、`src/game/*.js`（新建目录） |
| 只读参考 | `src/lib/draft.js`、`src/lib/build.js`（遗留，勿引用） |

**任何一方不得修改他人文件。** 需要别人配合时，用 `send_message` 通知 LEAD。

---

## 3. 冻结的 API 契约

### 3.1 `scenes/arena.js` → `buildArena(scene, stage)`

返回对象（**字段只增不减**）：

```js
{
  root,                       // THREE.Group，整个场馆
  groups: {                   // 顶层构件族（图层开关 / 爆炸 / X-ray 依赖）
    bowl, concourse, facade, roof, structure, pitch, interior, seats, glow, site
  },
  ents: {                     // 可点选构件（射线拾取 → 高亮/说明）
    [id]: { id, mesh, parent, label, spec }
  },
  M,                          // 材质库（按 key 取）
  seatInst,                   // 座椅实例化结果
  model: MODEL,               // 座位统计模型（逐排逐区）
  lamps: [SpotLight...],      // 场地泛光灯（sky.js 会绑定）
  ring: refRing(SEGS),
  TIERS, L1, L2, L3, GEO, BACK_S, BACK_Y,
}
```

新增要求（本轮）：
- `groups.structure`：独立的结构构件族（柱/梁/桁架），供"结构逻辑"演示与剖切；
- `ents` 至少包含：`pitch, bowl, concourse, facade, roof, roofTruss, masts, interior, hall, suites, locker, media, seats, site`；
- 提供 `arena.focusOn(id)`（返回 `Promise`，把相机推到该构件）与 `arena.setSolo(id|null)`、
  `arena.setVisible(id, bool)` 供 UI 调用；相机操作内部通过 `stage.focusRequest` 委托给 ui/orbit。

### 3.2 `scenes/env.js` → `buildEnv(scene, stage)`

```js
{ root, groups:{plaza,training,transit,parking,landscape,city,props}, update(dt,t), ents:{...} }
```
`env` 必须并入 `arena.ents` 的拾取范围（LEAD 会在 app.js 里合并），并支持 `groups` 显隐。

### 3.3 `scenes/sky.js` → `buildSky(scene)`

```js
{ dome, U, hemi, ambient, sun, floods, top, update(dt,t), bindStage(stage), bindLamps(arr) }
```
日间必须是**真实白天**（亮天、暖阳、地面亮、阴影读得出），夜间必须是**真实夜赛**（深蓝天、星、四组灯桥光斑、
草皮受光、外立面灯带层次）。切换用 1.2s 缓动，不得瞬跳。

### 3.4 `ui.js` → `buildUI(ctx)`

`ctx = { arena, env, sky, fx, orbit, walk, draft, stage, modes }`

返回（**只增不减**）：
```js
{ update(dt,t,fps), toast(title, body, kind), INTRO, goShot(name),
  setEnv('night'|'day'|'dusk'), setMat('material'|'white'|'xray'),
  setExplode(0..100), setSection(bool, cut), postBoot(), S }
```
新增需要：`setLayer(id, bool, solo)`、`openPanel(name)`、`setMobile(bool)`、`photoMode(bool)`、
`getLayout()`（返回面板可见性以便测试）、`toggleBrief()`。

### 3.5 `game/*.js`（T3 新建）

游戏状态集中在 `src/game/state.js`，暴露：
```js
window.__game = {
  xp, level, badges:[], missions:[{id,name,desc,done,reward}], stats:{}, mode,
  addXP(n), complete(id), reset(), save(), load(), onChange(cb)
}
```
HUD 只通过 `window.__game` + `document.addEventListener('game:changed')` 读取，**不得直接 import** game 模块，
避免循环依赖。T3 负责在 `app.js` 之前初始化（LEAD 会在 boot 里 `import('./game/state.js')` 并挂到 window）。

### 3.6 `camera/交互` 保留 API

- `orbit`: `.update(dt)`, `.set({target,dist,az,el})`, `.snapTo(pose)`, `.enabled`, `.dist`, `.target`,
  `.startAuto(list, sec)`, `.stopAuto()`, `.tTarget/.tDist/.tAz/.tElv`
- `walk`: `.update(dt)`, `.start(vec3)`, `.stop()`, `.active`, `.pos`, `.yaw`, `.pitch`
- `draft`: `.get('plan'|'front'|'left'|'section')`, `.fit()`
- `fx`: `.render(dt,t)`, `.flash(color, amt)`, `.setDraft(bool)`, `.setDraftCamera(cam)`, `.bloomEnabled`, `.exposureBoost`
- `modes`: `.setMode`, `.setExplode`, `.setSection(bool, vec3, cut)`, `.setLayer`, `.update(dt)`

### 3.7 `game/*` v3 模块契约（新增）

| 模块 | 职责 | 暴露 |
|---|---|---|
| `state.js` | XP / 等级 / 任务 / 徽章 / 解锁 / 存读档 | `window.__game` |
| `badges.js` | 徽章位置与收集判定（位置由 `rings.pt()` 推导） | `window.__badges`（**唯一实现**） |
| `objectives.js` | 任务区域判定 + 3D 光柱信标 + 地面圆环 + 悬浮菱形 | `window.__objectives` |
| `insights.js` | 12 处建筑洞察热点与收录判定 | `window.__insights` |
| `evacuation.js` | 潮汐调度：12 出口 / 人力预算 / 队列模型 / 评级 | `window.__evac` |
| `photo.js` | 照片模式与构图评分 | `window.__photo` |

**真源规则（硬约束）**
- `ui.js` **不得**自行实现徽章计数、任务区域判定、疏散总量；一律读 `window.__game` / `window.__badges` / `window.__evac`。
  `ui.js` 的徽章逻辑仅作**降级实现**，游戏层存在时不得重复计分。
- 目标与洞察的定位一律使用体育场自身 **(s, y, u)** 坐标，禁止使用世界 `x/z` 硬编码。
- 可行走高度 `y < 30`（`walk.standOK`）：L3 环廊与看台不可行走，徽章/目标/洞察必须落在 `y < 30`。
- **券洞与门厅（漫游模型硬约束）**：
  - 券洞开口一律用**世界坐标**判定（`min(|x|,|z|) < portalHalfU × 周长 ≈ 9.8m`），
    **禁止**用 `locate().u`（它被量化到 192 段，偏离主轴 2m 就误判）。
  - 券洞轴线上、**顶层环廊下方是贯通到地面的门厅空腔**（地面 0，进深约 8.8m），
    其余位置是看台后墙（实心）。否则穿墙判定会用"地面高差 42m"把玩家挡在主入口外。
  - 任何任务信标 / 洞察热点都必须落在 `groundAt(信标) ≈ 信标 y`（终验断言 `beaconGround`）。
- 环向约定：**u = 0 → +z**（北门主轴），`dirOf(u) = (sin 2πu, cos 2πu)`；
  `env.js` 的 `angOf(u) = 2πu − π/2` 与之相反（因 4 重对称未暴露问题），**勿混用**。
- 容量相关的一切数字（仪表 / 疏散总量 / 任务文案 / 立牌）必须读 `MODEL.total`，禁止写死。

---

## 4. 验收标准（必须逐条自测并截图）

### 造型与结构
1. 场地**完全露天**：从任何机位能看见天空穿过内檐开口。
2. 屋盖是**鞍面**（四边高、四角低），内外均可见桁架；无纸片、无悬空。
3. 8 根潮柱落地，柱—环梁—桁架—檩条传力链可读。
4. 外立面 3 道潮线 + 4 主入口券洞清晰可辨；入口内退可见门厅。
5. 三层看台 + 3 层环廊 + 包厢层，断面无穿插。

### 容量
6. 总座 = **80,952**（≥ 80,000），且 = 逐排逐区求和（`MODEL.total`）；
   **座椅实例数 / 仪表读数 / 疏散总量 / 任务文案 四者同源**。
7. 每层、每区、每排数字可查；含无障碍席 120（= 20 区 × 3 层 × 2）、包厢席 768、媒体席 320。

### 环境
8. 球迷广场（≥6 万 m²，实测投影约 **20 万 m²**）、2 块训练场、商业餐饮带、公交/地铁接驳、停车楼、景观绿地全部可见且**有组织**。
9. 周边其他建筑为**半透明白色体块**，成街廓肌理，不与主馆打架。

### 室内（剖切/漫游可达）
10. 入口大厅、环廊、包厢、更衣室+球员通道、媒体发布厅 均可进入且相互连通。

### 表达与交互
11. 昼/夜/黄昏切换 1.2s 缓动；夜赛灯桥光斑真实。
12. 材质/白模/X-ray/爆炸（0-100 连续）；二维俯视/正视/左视/剖切；剖切位置可拖动。
13. 点选构件 → 高亮 + 名称/规格卡；双击 → 孤立；右键/按钮 隐藏；`F` 对焦。
14. 第一人称漫游：WASD+Shift+鼠标、碰撞上台阶、能走进大厅/环廊/包厢/更衣室、`R` 自动巡游、`Esc` 退出。
15. 移动端（390×844）：竖屏可操作，触控摇杆/按钮，面板可折叠。

### 游戏性
16. 6 个任务（探索/容量/疏散/建造/摄影/收藏），完成有 XP、等级、徽章、存档（localStorage）。
17. 等级解锁**真实能力**（非纯数字）：Lv2 黄昏 · Lv3 滤镜+构图评分 · Lv4 应急广播 · Lv5 建筑洞察图鉴。
18. **成长曲线必须自洽**：一次性内容积分 = 任务 196 + 徽章 5×24 + 洞察 12×16 = **508 XP**，
    必须能自然升到 Lv.5（480 XP）；任何解锁档位都不得需要靠刷重复内容才够得着。
19. 建筑洞察图鉴：12 处细节热点（潮柱/鞍面屋盖/悬挑内檐/三道潮线/券洞/三层看台/一层环廊/
    包厢夹层/上层环廊/球员通道/四组灯桥/LED 广告板），走近 5m 收录 +16 XP。
    **未解锁时面板也必须可用**：显示 12 条收集清单（已找到的标绿）+ 解锁路径与进度；
    解锁后才展开每条的设计讲解。
20. 疏散演练：**80,952 人分批**、12 出口（4 主 + 8 次）、**10 组人力预算**、110s 时限、
    实时排队/四向压力反馈、3D 闸口状态牌、3 次应急广播、**S/A/B/C/D 评级 + 真实失败态**。
    超额开启出口必须被拒绝（人力不足）。
21. 建造逻辑：5 阶段动画（基础→看台→屋盖→立面→竣工），可拖动时间轴。
22. 照片模式：隐藏 HUD、景深/曝光可调、可截图下载；含**构图评分**
    （构图三分位 30 + 水平姿态 20 + 曝光 20 + 视角高度 30；S≥88 / A≥78 / B≥66 / C≥50，≥78 分 +20 XP）。
23. 任务判定只认**落地后的站位**：入场过渡（镜头→人眼的插值）途中不得触发任务。

### 性能
24. 桌面 1440×900 `fps ≥ 55`（真机基线 44–52）。
    draw calls ≤ 260（当前 **244**）。三角面 ≤ 1.2M（当前 **1,022,006**）。
25. `window.__stats = {fps, tris, calls, seats}` 必须真实（已修：实测返回真实值）。
    ⚠️ headless 软件光栅环境下 `fps` 因 dt 钳制而虚高，**不可直接采信**。
26. 首屏可交互 ≤ 6s（终验实测 **2.1s** @ 软件光栅）；LOD 与渐进式加载可见（分阶段进度条对应真实阶段）。

### 无障碍
27. 键盘全可达、焦点环、`aria-label`、对比度达标、`prefers-reduced-motion`。

---

## 5. 测试协议

```powershell
cd D:\Desktop\世界杯3d\tools
node audit.cjs              # 全量：控制台错误 / fps / 各模式截图 → tools/audit/
node audit2.cjs             # v3 终验：容量同源 / 目标闭环 / 调度台 / 疏散 / 性能 → tools/audit2/
node evac_test.cjs          # 疏散策略验收（实测 68.8s / S / 任务 m5 达成）
node evac_sim.mjs --sweep   # 疏散平衡离线仿真 + 参数扫描
node quick_check.cjs        # 图鉴 / 解锁 / 构图评分 / 照片条
node playability_probe.cjs  # 可玩性取证（只读）
node walk_probe.cjs         # 漫游站位轨迹（查地面/站位异常）
node ground_probe.cjs       # 地面剖面量测（walk.groundAt 沿轴向）
node lobby_probe.cjs        # 主入口可达性（同步步进模拟按键行走）
```
- 任何改动后必须跑一次截图脚本，把 `tools/audit*/*.png` 看一遍再交付。
- 交付时必须附带：`{fps, calls, tris, 控制台错误数}` 的实测值。
- **不要**给 Chromium 加 `--use-gl=angle` 等 GL 参数（会白屏，误判）。
- 本机为**软件光栅**（SwiftShader），headless 下 rAF 仅约 2 fps。
  任何"等若干秒"的探针都会失真 → 必须用 `page.waitForFunction` 做条件等待。
