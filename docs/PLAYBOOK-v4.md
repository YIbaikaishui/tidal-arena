# 潮汐场 TIDAL ARENA —— v4 迭代手册（LOOP PROTOCOL）

> 本文件定义 v4 的**自迭代循环规程**。每一轮都按同一节奏跑，任何人（或任何 agent）
> 接手都能从「轮次日志」的最后一节继续往下做，不需要重新调研。
>
> 契约文件分工：
> - `docs/SPEC.md`：造型 / 模块边界 / 冻结 API / 验收标准（**改动它必须有充分理由**）
> - `docs/CHANGELOG-v3.md`：v3 已完成的改动与取证
> - `docs/PLAYBOOK-v4.md`（本文件）：v4 的循环规程 + 每轮日志
> - `docs/SPEC-v4.md`：v4 新增模块契约（随实现同步更新）

---

## 0. 运行方式（**改代码后必须重新打包**）

```powershell
cd D:\Desktop\世界杯3d\tools
node bundle.cjs          # src/boot.js → src/bundle.js（esbuild，~0.7s）
node v4_probe.cjs        # 全量验收（~90s），产出 tools/v4/check.json + 截图
```

- 页面入口是 `index.html` → `./src/bundle.js`（**不是** `./src/app.js`）。
  **只改 `src/` 不跑 `bundle.cjs`，浏览器看到的仍然是旧代码**——这是 v4 最容易踩的坑。
- 静态服务由用户提供（`python -m http.server 8099`），**不要自行起服务**。
- `tools/serve.cjs` 是备用的零依赖静态服务器（需要换端口时用）。
- 本机是软件光栅（SwiftShader），headless 下 rAF 只有 ~2–17 fps：
  **fps 一栏不可采信**，draw calls / 三角面 / 逻辑闭环有效。

## 0.1 为什么改成打包

原始形态是 `index.html` 直接 `<script type="module" src="./src/app.js">`，依赖 importmap 解析
裸标识符 `three`。实测在**二次加载（刷新）**时，6 个游戏模块会报
`Failed to resolve module specifier "three"`，整层游戏（任务/徽章/疏散/图鉴）静默丢失，
只剩一个"能看不能玩"的静态展示。

打包成单个 ESM（`format: 'esm'`，`three` 仍走 importmap 外部化）后连续刷新 3 次均正常。
⚠️ 不能用 `format: 'iife'`：esbuild 会把外部 ESM 降级成 `require('three')`，
浏览器直接抛 `Dynamic require of "three" is not supported`。

---

## 1. 循环规程（每一轮都按这 5 步走）

| 步 | 动作 | 产出 |
|---|---|---|
| **① 分析** | 读 `tools/v4/check.json` 的失败项 + 未覆盖缺口（§2 清单），挑 1 个主题 | 本轮假设（一句话） |
| **② 实现** | 小步改动，单主题；遵守 §3 的模块归属与真源规则 | 代码 diff |
| **③ 打包** | `node bundle.cjs` | `src/bundle.js` 更新 |
| **④ 取证** | `node v4_probe.cjs`；失败项必须修到通过，或明确记为"已知缺陷" | `check.json` 摘要 |
| **⑤ 记录** | 在本文件 §5 追加一条轮次日志：假设 / 改动 / 实测 / 结论 / 下一轮 | 轮次日志 |

**硬规则**

1. **证据优先**：任何"已优化"的结论都必须对应 `check.json` 里的一条实测；不许只写"感觉更好了"。
2. **不降门槛凑通过**：探针失败时改代码，不改进探针的阈值（阈值改动必须写进轮次日志并说明理由）。
3. **一次一个主题**：一轮只动一个可玩性维度，避免"一把梭"后无法归因。
4. **已知缺陷必须挂账**：本轮没修的，写进 §4「账本」，下一轮优先。
5. **不回滚**：改坏了新建提交或另存，不用 `git checkout --` / `reset --hard` 丢弃改动。

---

## 2. 可玩性维度清单（缺口 → 主题）

> 判断标准：**玩家有没有"下一次还会想玩"的理由**。
> 纯观看/无失败/无选择的交互不算可玩性。

| # | 维度 | v3 状态 | v4 目标 | 状态 |
|---|---|---|---|---|
| P1 | 目标感 | 6 任务 + 光柱信标 | 保持 | ✅ v3 |
| P2 | 决策深度 | 疏散只有 1 个工况，最优解固定 | **多工况 + 三表记分 + 个人最佳** | 🔧 轮次 R2 |
| P3 | 失败观感 | 失败只有一行 toast | 失败有复盘（哪里堵、为什么） | ⬜ |
| P4 | 重复可玩 | 一次性内容收齐即结束 | **每日挑战（确定性种子 + 门槛）** | 🔧 轮次 R3 |
| P5 | 收集品 | 5 徽章 + 12 洞察（全是"走到就拿"） | 增加需要**观察/操作**才能拿的收集品 | 🔧 轮次 R4 |
| P6 | 自发性 | 无动态世界 | **比赛日时段循环**（赛前/开赛/中场/赛后），时段改变氛围与可用玩法 | 🔧 轮次 R1 |
| P7 | 相机/创作 | 照片模式 + 构图评分 | 照片挑战与评级榜 | ⬜ |
| P8 | 存档可靠性 | 刷新后徽章/洞察"复活" | 关卡状态持久化 | 🔧 轮次 R0 |

## 3. 真源与模块归属（v4 增补，v3 规则继续有效）

| 真源 | 文件 | 对外 |
|---|---|---|
| XP / 等级 / 任务 / 徽章 / 洞察存档 | `src/game/state.js` | `window.__game` |
| 徽章位置与收集 | `src/game/badges.js` | `window.__badges` |
| 建筑洞察 | `src/game/insights.js` | `window.__insights` |
| 疏散模型与工况 | `src/game/evacuation.js` | `window.__evac` |
| **成绩 / 三表 / 个人最佳** | `src/game/contest.js` | `window.__contest` |
| **每日挑战种子** | `src/game/daily.js` | `window.__daily` |
| **比赛日时段** | `src/game/dayPhase.js` | `window.__day` |
| 徽章印章 / 画廊 | `src/game/stamps.js` | `window.__stamps` |
| 世界依赖（钉死副本） | `src/world/{sections,rings,walkr}.js` | 仅被 `game/*` 引用 |

- 存档格式升级必须**向后兼容**：`load()` 读到旧字段要能降级，不许因字段缺失抛错。
- UI 不得自行计算成绩 / 评级 / 收集数；一律读上述 window 单例。
- 新增 `game/*` 模块一律在 `src/game/index.js` 里用 `guard()` 包裹初始化，
  单个模块失败不得影响其余模块（`window.__gameApi.errors` 会记录）。

---

## 4. 已知缺陷账本（按优先级）

| ID | 现象 | 影响 | 处置 |
|---|---|---|---|
| A1 | `audit2.cjs` 称「容量同源 ×5」，但 `#capNum` 在 `__ready` 时刻实测为 **0**（大数字滚动动画在软件光栅下停在首帧） | 观感：仪表盘数字停在 0；审计口径失真 | ⬜ 待修：`rollCap` 增加兜底（requestAnimationFrame 不推进时用定时器/直接置终值） |
| A2 | v3 截图未覆盖：玩家视角下的信标/闸口/图鉴发光体 | 可能"看不见光柱" | ⬜ 待补：第一人称截图取证 |
| A3 | **刷新后游戏层整体丢失**（`Failed to resolve module specifier "three"`） | 致命：只剩静态展示 | ✅ **R0 已修**（打包为 `src/bundle.js`） |
| A4 | 刷新后已收集的徽章 / 洞察**复活**（`taken` / `got` 未持久化），HUD 徽章条归零，但 XP 与计数还在 → 可重复刷分 | 严重：存档自相矛盾 + 刷分漏洞 | 🔧 R0 |
| A5 | `evac.reset()` 不清 `st.done / elapsed / evacuated` | 上一局结果泄漏到下一局 | 🔧 R2 |
| A6 | `evac.broadcast()` 的效果作用在 `st.zones`，但每帧都会被重算覆盖；且没有扣减人力预算 | 广播是"假的"，玩家感觉被欺骗 | 🔧 R2 |
| A7 | 场景中徽章有**两套几何**：`badges.js` 的 `GAME_BADGES` 与 arena 里的 `BADGES`（纯装饰，未收集） | 玩家看到"拿不到的徽章" | ⬜ 待评估（可能是造型需要） |
| A8 | 洞察与徽章都是"走到就自动拿"，零观察成本 | 收集品没有"发现"的乐趣 | 🔧 R4 |
| A9 | 探针曾在游戏层未就绪时读状态（`__game` 为真但 `__badges` 未定义），造成**假通过/假失败** | 审计不可信 | ✅ 已修：退出条件改用 `__gameApi + __badges + __objectives + __insights` |
| A10 | 子代理/他人若直接改 `src/lib/sections.js`（v3 中那样），`src/world/` 的钉死副本不会同步 → 徽章/洞察/目标/疏散会按旧几何定位 | 位置错乱 | ⬜ **必须**同步刷新副本（见 §6） |
| A11 | 停电工况下"只开 4 主券洞"成绩 0%，惩罚可能过重、新手挫败 | 观感 | ⬜ 待评估（有工况说明文案兜底） |
| A12 | 夜间闸口牌在日间时段依然显示，可能与"赛前"语义不符 | 观感 | ⬜ 待评估 |

---

## 5. 轮次日志

### R0（基线 + 解除阻塞）

- **假设**：v3 宣称的"能玩"建立在**一次**成功启动上；一旦刷新，游戏层就不存在了。
- **取证**：`v4_probe.cjs` 基线 8/11：
  - `boot.*` 全绿（capNum 80952 / 同源 80952 / 254 calls / 1,020,559 tris）
  - `persist.badgeVisual` ✗ 刷新后 `badgesTaken: []`（徽章复活）
  - `persist.insight` ✗ 刷新后 `insightsGot: []`
  - `persist.hudBadge` ✗ HUD 徽章条为 0
  - 另：刷新后 `window.__gameApi === undefined`（A3）
- **改动**：
  - 新增 `src/boot.js` + `tools/bundle.cjs`（esbuild，`format: 'esm'`）→ `src/bundle.js`
  - `index.html`：入口改为 `./src/bundle.js`，移除 7 条已失效的 `modulepreload`
  - `tools/package.json`：加 esbuild 与 `build/watch/serve/v4` 脚本
- **实测**：连续刷新 3 次 `__gameApi/__badges/__game` 均存在，控制台 0 错误。
- **结论**：A3 关闭。剩余 A4 是新的 P0（存档自相矛盾 + 刷分漏洞）。
- **下一轮**：R0.1 = 存档持久化（A4），然后 R1 = 比赛日时段循环（P6）。

### R0.1（存档持久化 + 两个隐蔽的架构坑）

- **假设**：A4 不只是"没存"，而是"存了也读不回来"——模块求值顺序与模块实例数都有坑。
- **改动**：
  1. 新增 `src/game/caps.js`（存档能力层 `window.__caps`，`localStorage: tidal_arena_caps_v1`）
  2. `badges.js`：`collect()` 写 `badgesTaken`；构造时 `restore()` 回灌；`game:reset` 还原世界
  3. `insights.js`：`collect()` 写 `insightsGot`；新增 `grant(id)` 与 `restore()`
  4. `state.js`：`reset()` 同时清 caps（否则重置后世界里的徽章消失、永远集不齐）
  5. `app.js`：游戏层由 **动态 `import()` 改为静态导入**
- **踩到的两个坑（都很隐蔽，值得记下来）**：
  - **坑 1：模块被求值两次。** `index.html` 里的 `modulepreload` + `app.js` 里的动态 `import()`
    会产生两份并发的模块图请求，`state.js` 被求值两次 → 两个 `__game` 实例，
    `caps.js` 的闭包状态（`S`）也有两份 → `__caps.report()` 读到 0 而 `localStorage` 里明明有数据。
    修法：静态导入，整条依赖链只求值一次。
  - **坑 2：`export function` 提升 + 模块求值期调用。**
    `badges.js` / `insights.js` 都在**自己的求值期**调 `caps.restore()`，
    而 `caps.load()` 当时还只由 `index.js` 的 `init()` 调 → restore 时读到的是空白 DEFAULT。
    修法：`caps.js` 在模块体里直接调用 `load()`（函数声明会提升，顺序安全）。
    **教训**：任何"存档层"的读盘都必须在模块求值期完成，不能等 init 编排。
- **实测**（`node v4_probe.cjs`）：**12/12 通过**
  - `persist.badgeVisual ["b1"]` / `persist.insight ["i1","i11"]` / `persist.hudBadge 1`
  - `boot.*` 不变：capNum 80,952 · 同源 80,952 · 254 calls · 1,020,559 tris
  - `evac.legacyCloses` 68.8s / S（与 v3 基线完全一致 → 没有回归）
- **结论**：A3 / A4 关闭，P8 达成。现在"刷新不丢进度"，才谈得上"再来一局"。
- **下一轮**：R1 = 比赛日时段循环（P6）。

### R1（创造性：比赛日时段循环 + 世界层架构整改）

> 设计动机：场馆已经有昼/夜/黄昏三套照明，但玩家**没有理由**去用它们 ——
> 切换是"看效果"，不是"玩"。把照明绑到**比赛日流程**上，每个时段承担不同玩法，
> 三套照明就从"皮肤"变成"关卡"。

- **假设**：把 赛前 → 开赛 → 中场 → 赛后 做成一条可推进的状态机，
  每个时段改观感并强化一种玩法，玩家会主动"打一个比赛日"。
- **改动**：
  - 新增 `src/game/dayPhase.js`（`window.__day`）：4 时段 × 照明预设 × 玩法钩子
    （pre=日间/建馆·容量·摄影、kickoff=夜赛/疏散×1.15、halftime=黄昏/摄影分×1.2、after=日间/满员疏散）
  - 顶栏新增「比赛日」徽标（`#btnMatch`）：显示时段、天数、开赛时呼吸闪烁；点它推进时段
  - `ui.js` 新增 `syncDay()` / `bindDay()`，由 `day:phase` 事件驱动
- **架构整改（本轮最大风险点）**：
  为了让 `state.js` 能在主循环跑起来之后再 `import('./world.js')`，
  必须拆成 `game/init.js`（只依赖 state.js）+ `game/world.js`（世界层总装）。
  ⚠️ **踩到的坑**：世界模块与 `lib/*` 共享同一份 `state.js`，
  一旦 `state.js` 静态 import 任何会拉进 `scenes/arena.js` 的东西，
  arena 的求值期代码就会在 `lib/walk.js` 完成之前执行
  → `Cannot access 'Walk' before initialization` → 整页白屏。
  修法：世界依赖单独放 `src/world/`（sections / rings / walkr 三份**钉死副本**），
  让延迟包与静态包物理隔离。`walkr.js` 只改了一处 import 指向 `../lib/core.js`。
- **实测**：`node v4_probe.cjs` **26/26**；`node v4_ui.cjs` **9/9**（含 390×844 不溢出）；
  `day.kickoffNight` → 开赛时段自动切到夜赛照明；`day.afterDusk` → 赛后回到日间。
- **口径修正（诚实记录）**：`boot.calls` 阈值 260 → 300。
  原因不是"优化了引擎"，而是默认时段从「夜赛」变成「赛前·日间」，
  泛光/水面 pass 在日间更多：实测 **日间 279–290 / 夜赛 288–290**，v3 基线 254 是夜赛口径。
  这条改动写进探针注释，避免用一个数字掩盖两种时段。
- **下一轮**：R2 = 疏散多工况 + 三表记分（P2）。

### R2（可玩性：疏散多工况 + 三表 + 平衡）

- **假设**：v3 的疏散只有一个工况，玩家第一局就找到"标准答案"，之后没有决策。
- **改动**：
  - `evacuation.js` 重构：把模拟抽成**纯函数** `createSim(info)`（不碰 3D/DOM），
    运行时 `createEvac` 只负责 3D（热力团 / 12 个闸口牌）与事件
  - 新增 4 个工况（`SCENARIOS`）：晴好 / 暴雨 / 停电 / 开赛前 5 分钟，各自改出口能力、步行速度、时限
  - 新增 `window.__evac.simulate()`：用与主循环相同的 0.1s 步长做只读快进，供离线扫描
  - 新增 `src/game/contest.js`（`window.__contest`）：疏散表 / 摄影表 / 综合表 + 个人最佳
  - UI：疏散面板新增工况 chips、工况说明、人力/时限/广播/评级四联读数
- **修掉的两个真 bug**：
  - **A5 `evac.reset()` 不清 done/elapsed** → 上一局结果泄漏；本轮进一步发现
    **`start()` 会把玩家调好的出口组合静默重置**（离线扫描 12 种组合全同分正是由此暴露）。
    修法：`start()` 清成绩但**保留玩家布局**。
  - **A6 广播是"假的"** → 原来改的是 `st.zones`，每帧都会被重算覆盖，且不消耗人力。
    现在：广播真的抽调 2 组在岗班组（`offDuty`），削弱最堵出口的排队惩罚 12s，
    并在 `broadcastT` 期间结束才归还人力。
- **平衡取证（`tools/evac_sweep.mjs`，12 种出口组合 × 4 工况）**：

  | 工况 | 时限 | 最优组合 | 用时 | 评级 | 关键对比 |
  |---|---|---|---|---|---|
  | 晴好夜赛 | 110s | 4 主 + 2 次（S1/S5） | 91.8s | B | 只开 4 主 105.3s；只开 8 次 80.5% 失败 |
  | 暴雨 | 118s | 4 主 + 2 次（S1/S5） | 106s | B | 只开 4 主 80.5% 失败 |
  | 停电 | 132s | **仅 8 次门** | 120.5s | B | 只开 4 主 **0%**；4 主 + 2 次只有 23.8% |
  | 开赛前 5 分钟 | 104s | 4 主 + 2 次（S1/S5） | 97.4s | B | 只开 4 主 67.2% 失败；3 主 + 4 次 74.7% 失败 |

  `evac_sweep.mjs` 现在是**带门槛的回归脚本**：每个工况必须"有的赢、有的输"、
  最优组合必须余量 ≥5s、并且不同工况最优解必须不同（否则判定"决策是假选项"并退出码 2）。
- **第一版设计被自己否掉了**：最初 4 主券洞合计 1360 人/秒，超过全场最优步行吞吐，
  于是 12 种组合全同分（68.8s / S）—— 这是"假选项"。把 `MAIN_CAP` 340 → 230、
  `SUB_CAP` 150 → 130 之后决策才成立（v3 的 68.8s / S 基线因此作废，属于**有意的重新平衡**）。
- **实测**：`v4_probe` 26/26（`evac.policies` 4 工况全部收敛；`evac.noCarryOver` 换工况冷启动为 0）
- **下一轮**：R3 = 每日挑战 + 印章（P4 / P5）。

### R3（重复可玩：每日挑战 + 建筑印章）

- **假设**：一次性内容收齐后游戏就"结束"了；v3 的答案是"重复刷"，但重复刷同样的内容没有意义。
- **改动**：
  - 新增 `src/game/daily.js`（`window.__daily`）：按**日期做 FNV-1a 种子**生成今日三项挑战
    （疏散工况 + 摄影地点 + 印章目标 + 门槛），同日确定性、跨日轮换
  - 新增 `src/game/stamps.js`（`window.__stamps`）：7 枚**成就型**印章（不是散落道具，
    而是"你做过的事"的凭证）：破土 / 总座 / 全夜灯 / 满员 / 极光 / 潮线 / 调度，每枚 +12 积分
  - 新增右栏「成绩」面板（`#pContest`）：今日挑战清单 + 三表徽章 + 印章墙
- **修掉的 bug（本轮的"自己的坑"）**：
  - 印章达成瞬间的光环 `RingGeometry + DoubleSide` 在深色场景叠加后**过曝成一片粉色实心圆盘**
    （截图确认）。改为细环 + 加色混合 + 上限 0.55 不透明度 + 缩放上限 1.6。
  - `daily` 早于 `stamps` 就绪时 `T.stamp = null`，导致"今日印章"永远判不达成 → 改为懒补建。
  - 每日挑战的印章判据原先读存档字段，与"实时发放"分歧 → 统一问 `window.__stamps.has()`。
- **实测**：`daily.deterministic` / `daily.rotates` 通过；`v4_ui.cjs` 9/9
  （工况 chips 4 个、切到「停电」时限变 124″、成绩面板三表 + 7 印章 + 3 条挑战、每日 3/3 完成 +30 积分）
- **下一轮**：R4 = 失败复盘 + 印章的"需要观察"路径（P3 / P5 深挖）。

---

## 6. `src/world/` 钉死副本的同步规程（A10）

`src/world/` 下的三份文件是 `src/lib/` 对应文件的**副本**，用于把"延迟加载的世界包"与
"首屏静态包"物理隔离（见 R1 的 `Walk before initialization` 坑）。代价是**两份真源**。

**任何改动 `src/lib/sections.js` / `rings.js` / `walk.js` 之后，必须同步副本**：

```powershell
cd D:\Desktop\世界杯3d
Copy-Item src\lib\sections.js src\world\sections.js -Force
Copy-Item src\lib\rings.js    src\world\rings.js    -Force
Copy-Item src\lib\walk.js     src\world\walkr.js    -Force
# walkr.js 只需要把 './core.js' 指回 '../lib/core.js'（只此一处差异）
(Get-Content src\world\walkr.js -Raw).Replace("from './core.js'", "from '../lib/core.js'") |
  Set-Content src\world\walkr.js -NoNewline -Encoding utf8
cd tools; node bundle.cjs
node v4_probe.cjs --only=persist,boot   # 徽章/洞察能拿到，说明几何一致
```

校验两份是否漂移：

```powershell
foreach ($f in 'sections','rings','walk') { $a='src\lib\'+$f+'.js'; $b= if($f -eq 'walk'){'src\world\walkr.js'}else{'src\world\'+$f+'.js'}; $d = Compare-Object (Get-Content $a) (Get-Content $b) | Measure-Object | Select-Object -Expand Count; "$f 差异行数: $d" }
```
（`walk` 允许 1 行差异，即 `core.js` 的路径。）

## 7. 每轮必跑的脚本清单

| 脚本 | 用途 | 通过标准 |
|---|---|---|
| `node bundle.cjs` | 打包 | 无 ERROR |
| `node v4_probe.cjs` | 逻辑/存档/工况/成绩/每日/时段 | 全绿（当前 26 项） |
| `node v4_ui.cjs` | 新面板 DOM + 截图（含 390×844） | 全绿（当前 9 项） |
| `node evac_sweep.mjs` | 疏散平衡门槛（多工况最优解必须不同） | 退出码 0 |
| `node playability_probe.cjs` | 可玩性取证（v3 遗留，只读） | 控制台 0 错误 |
