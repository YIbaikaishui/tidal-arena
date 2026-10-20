# dsh-session-recover — DSH 会话日志检查/抢救 CLI

DSH 把每个会话写成 `~/.dsh/sessions/<工作区编码>/<会话id>/session.v4.jsonl.zstd`。
这个文件不是普通 `.zst`，而是**拼接的 zstd 帧容器**：

```
[帧1: 会话头 + 前几条事件][帧2: 一次 append 批次][帧3: ...][帧N]
```

- 每一帧都带 checksum（`ZSTD_c_checksumFlag`）
- 帧内是 JSON Lines（`{"type":..., "seq":..., "time":..., "data":...}`）
- 正常追加路径是「写帧 → fsync」；因此**单帧损坏不应该影响之前的帧**

会遇到的两种现实问题：

1. **帧内数据被写坏**：典型症状是文件中间出现 `{bad cell}` → `decompress: Data corruption detected`
   （本次实测：`session-99381703` 有 22 个坏帧 / 1733 字节；另一条健康会话也有 12 个 / 954 字节）。
   DSH 的启动扫描会停在第一个坏帧，**之后的会话历史在重载时丢失**。
2. **撕裂的尾帧**：进程被强杀时最后一帧只写了一半，解码后是一行不完整的 JSON（`{"typ`）。

本工具就是为这两种情况准备的。

## 用法

需要 Node ≥ 22.15（或任何自带 `node:zlib` zstd 的版本），**无第三方依赖**。

```bash
# 1) 体检：报告帧数、坏帧字节位置、事件行数、重复 seq
node bin.mjs scan    ~/.dsh/sessions/<ws>/<id>/session.v4.jsonl.zstd

# 2) 抢救明文：把所有能解出来的事件导出成 jsonl（人肉找最后的进度/上下文）
node bin.mjs dump    <日志>  ~/Desktop/recovered.jsonl        [--force]

# 3) 重新打包：把所有能解出来的事件重写成「单帧」会话文件，DSH 可以重新加载
node bin.mjs recover <日志>  ~/Desktop/recovered.v4.jsonl.zstd [--force]
```

`recover` 的行为约定：

- **绝不覆盖输入文件**；输出已存在时默认拒绝，除非显式 `--force`
- 按扫描顺序拼接事件，跳过重复 `seq` 的副本
- 写完会自己解压一遍做一致性自检（输出 `自检解压一致: true`）

## 恢复出来的文件怎么用

`recover` 产出的是**副本**，不会自动放回 `~/.dsh/sessions/`。
想让它出现在 DSH 的历史列表里，需要你自己把 `session-<id>` 目录换成恢复版本：

```bash
# 先备份原目录，再替换（DSH 未运行时执行）
mv <会话目录> <会话目录>.bak
mkdir <会话目录>
cp <恢复文件> <会话目录>/session.v4.jsonl.zstd
```

> 注意：这等于改写历史记录。坏帧里的事件**已经丢失**，恢复版本只是「把能救的都救回来」，
> 不是原样还原。所以默认建议先用 `dump` 看内容，确认没有重要信息再决定是否替换。

## 已实测的结果（2026-10-18）

| 对象 | 帧 | 坏帧 | 事件行 | recover 结果 |
|---|---|---|---|---|
| `session-99381703`（世界杯3d，历史损坏） | 963 | 22（1733 B） | 1627 | 1618 事件，735 KB 单帧，自检一致 |
| `session-8a186851`（同期健康会话，作对照） | 829 | 12（954 B） | 1454 | 正常（说明这类坏帧并非该会话特有） |

## 已知限制

- 坏帧**内部**的事件无法还原（除非改成明文 JSON 存储）
- 工具只做容器层修复，不校验事件语义（不会补 `seq` 空洞）
- 该 CLI 只依赖 Node 标准库，可直接在 Windows / macOS / Linux 上跑
