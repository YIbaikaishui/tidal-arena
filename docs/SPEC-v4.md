> 本文件是 v4 的**新增模块契约**。`docs/SPEC.md` 里的造型语言、模块边界、验收标准全部继续有效；
> 本文件只登记 v4 新出现的模块、全局单例与事件，以及它们与 v3 契约的关系。
> 迭代规程见 `docs/PLAYBOOK-v4.md`。

# 潮汐场 TIDAL ARENA —— v4 模块契约

## 0. 入口变化（重要）

| 项 | v3 | v4 |
|---|---|---|
| 页面入口 | `index.html` → `<script type="module" src="./src/app.js">` | `index.html` → `<script type="module" src="./src/bundle.js">` |
| 打包 | 无（浏览器原生 ESM + importmap） | `tools/bundle.cjs`（esbuild，`format: 'esm'`，`three` 外部化走 importmap） |
| 源码入口 | `src/app.js` | `src/boot.js`（只 import `app.js`）；**改代码后必须 `node bundle.cjs`** |

原因：v3 形态在**二次加载（刷新）**时 6 个游戏模块会报
`Failed to resolve module specifier "three"`，整层游戏静默丢失（见 PLAYBOOK A3）。

## 1. 游戏层装载顺序（v4 架构）

```
bundle.js ─┬─ src/app.js ── lib/*, scenes/*（静态）
           └─ src/game/init.js ── src/game/state.js（静态，无 three 依赖）
                                  └─ initWorld() ─→ import('./world.js')（延迟）
                                                     └─ 世界层 + world/ 依赖副本
```

- `app.js` 在首帧之后 `await gameLayer.init(window.__app)`；
- `init()` 先建 `state.js`（`window.__game`），再 `initWorld()` 拉世界层；
- 世界层就绪时派发 `game:ready`，并置 `window.__gameReady = true`。
- **判就绪请用 `window.__gameApi`**：`window.__game` 在 `state.js` 求值期就存在，
  早于世界层，拿它当"就绪"信号会读到半初始化状态。

## 2. 新增全局单例

### 2.1 `window.__caps` — 存档能力层（`src/game/caps.js`）
`localStorage: tidal_arena_caps_v1`，与 `tidal_arena_save_v1`（XP/任务/徽章 id）分工：
**这里存"世界状态"**（徽章 taken / 洞察 got / 印章 / 每日 / 成绩），v3 缺的就是这部分。

```js
{ KEY, get(k, dflt), set(k, v), add(key, id), has(key, id), hasAll(key),
  setFlag, save, load, report(), clear(), onChange(cb), state }
```

### 2.2 `window.__day` — 比赛日时段（`src/game/dayPhase.js`）

```js
{ phases: [{id:'pre'|'kickoff'|'halftime'|'after', name, en, env, accent, tip, hooks}],
  phase, setPhase(id, silent), next(silent), reset(), setAuto(bool),
  progress /* {phase,name,env,accent,evac,photo,hooks,tip,t,dur,progress} */,
  evacMods() /* {timePenalty, scoreMul} */, photoMods() /* {scoreMul} */,
  on(cb), days }
```
事件：`day:phase`（detail = progress）、`build:phase`（既有）。

### 2.3 `window.__evac` — 疏散（v4 扩展，v3 字段只增不减）

```js
{ // v3 既有
  state, start, pause, reset, on, update, exits, setExit, toggleExit, broadcast,
  total, evacuated, remaining, elapsed, success, score, running, paused, done,
  zones, heat, teams, teamMax, grade, peak, finishReason, limit, broadcastLeft,
  // v4 新增
  scenario /* {id,name,en,limit,capMul,walkMul,brief,...} */, scenarioId,
  scenarioIds /* ['calm','rain','power','kickoff'] */, scenarioLabel, scenarioBrief, scenarios,
  simulate({scenario, open|policy, each, limit}) /* 只读快进，步长 0.1s，与主循环同源 */,
  recomputeTotal(n) }
```
- `reset(id?)`：传工况 id 则切换到该工况（**完全冷启动**：elapsed/evacuated/done 归零）。
- `start()`：清成绩但**保留玩家当前出口组合**。
- `broadcast()`：真实消耗 2 组在岗人力（`state().offDuty`），削弱最堵出口排队惩罚 12s。
- 出口能力：主券洞 230 人/秒、次门 130 人/秒，再乘工况 `capMul`（停电再乘 `mainPenalty 0.45`）。

### 2.4 `window.__contest` — 三表（`src/game/contest.js`）

```js
{ tiers: ['evac','photo','overall'], submitEvac(scenarioId, {t, grade, success}),
  submitPhoto(score), board() /* {evac:{best, perScenario}, photo:{best}, overall} */,
  medal() /* [{id,name,got,label,hint}] ×3 */, coverage(), best(), clear(), isBetter(a,b),
  onChange(cb), snapshot() }
```
事件：`contest:changed`。

### 2.5 `window.__daily` — 每日挑战（`src/game/daily.js`）

```js
{ today /* {date, seed, scenario, photoSpot, photoName, photoHint, stamp, evacGrade,
             photoScore, items:[{id:'evac'|'photo'|'stamp', name, done}]} */,
  progress(), check(), force(date|null), refresh(), date, seedOf(d), keys, on(cb) }
```
- 种子 = `FNV-1a('tidal-daily-' + YYYY-MM-DD)`：**同日确定、跨日轮换**。
- 三项全达成 → 写 `caps.daily['daily:<date>'] = true`，+30 积分，派发 `daily:done`。

### 2.6 `window.__stamps` — 建筑印章（`src/game/stamps.js`）

```js
{ list: [{id,name,en,desc,color,got}] ×7, found, total, grant(id, quiet), has(id),
  evaluate(), restore(), update(dt), on(cb), help }
```
事件：`stamps:changed`。

## 3. 新增事件

| 事件 | 触发 | detail |
|---|---|---|
| `game:ready` | 世界层就绪 | `{errors}` |
| `game:reset` | `window.__game.reset()` | — |
| `day:phase` | 时段切换 / 每秒进度 | progress 对象 |
| `contest:changed` | 成绩写入/清空 | `{reason}` |
| `daily:changed` / `daily:done` | 刷新 / 三项达成 | 挑战对象 / 进度 |
| `stamps:changed` | 印章发放 | `{found,total,list,reason}` |
| `caps:changed` | 存档层写入 | `{reason}` |

## 4. UI 契约增补（`buildUI()` 返回值只增不减）

```js
{ // v4 新增
  syncDay(), syncContest(), syncFlowMeta(), buildContestPanel(), buildScenChips() }
```

## 5. 新增 DOM（index.html / styles.css）

| id | 位置 | 作用 |
|---|---|---|
| `#btnMatch` / `#matchName` / `#matchTime` | 顶栏 | 比赛日时段徽标（点它推进时段） |
| `#scenChips` / `#scenBrief` / `#flTeams` / `#flLimit` / `#flBc` / `#flGrade` | 疏散面板 | 工况切换与四联读数 |
| `#pContest`（`data-panel="contest"`） | 右栏 | 成绩与挑战：`#dailyDate` `#dailyPct` `#dailyItems` `#contestMedals` `#stampGrid` `#stampHelp` `#contestPct` |

## 6. `src/world/` 依赖副本（必须知道的约束）

`src/world/{sections,rings,walkr}.js` 是 `src/lib/` 的**钉死副本**，只被 `src/game/*` 引用。
目的：让延迟加载的"世界包"与首屏静态包**物理隔离**，避免
`Cannot access 'Walk' before initialization` 这类求值顺序崩溃。

⚠️ 改 `src/lib/sections.js` / `rings.js` / `walk.js` 后必须同步副本，规程见
`docs/PLAYBOOK-v4.md` §6，否则徽章/洞察/目标/疏散会用旧几何定位。
