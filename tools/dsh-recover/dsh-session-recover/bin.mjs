#!/usr/bin/env node
/**
 * dsh-session-recover — 检查 / 抢救 DSH 的会话日志。
 *
 * DSH 的会话文件 `session.v4.jsonl.zstd` 是**拼接的 zstd 帧容器**：
 *   - 第 1 帧：会话头（type: "session"）+ 开头若干事件，JSON Lines
 *   - 之后每次 append 批次 = 一个独立 zstd 帧（带 checksum）
 * 帧头损坏或帧内数据被写坏（典型症状：有效前缀之后出现重复的 seq、
 * 交错重叠的帧、帧后还有裸明文）时，DSH 启动扫描 `scanZstdFrames` 只能
 * 认到损坏点之前，之后的事件在重载会话时会丢失/重复。
 *
 * 本工具做三件事：
 *   scan    逐帧解析，报告每帧的字节范围、是否可解压、解出的事件 seq
 *   recover 把所有可解帧按顺序拼回一份「干净的单帧」会话文件（可被 DSH 重新加载）
 *   dump    把能解的明文导出成 .jsonl（用来人肉找上下文/最后的进度）
 *
 * 纯 Node（>= 22.15 或 20.11 带 zstd 的版本），不依赖第三方包。
 *
 * 用法：
 *   node bin.mjs scan    <session.v4.jsonl.zstd>
 *   node bin.mjs dump    <session.v4.jsonl.zstd> <out.jsonl>
 *   node bin.mjs recover <session.v4.jsonl.zstd> <out.v4.jsonl.zstd>
 *
 * 安全约定：recover **绝不** 覆盖输入文件；输出已存在时拒绝写入，除非加 --force。
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import zlib from 'node:zlib'

const MAGIC = 0xfd2fb528

/** 解析一个 zstd 帧的字节范围。返回结束偏移；帧头不合法时抛错。 */
function frameEnd(buf, start) {
  if (start + 5 > buf.length) throw new Error(`帧头不完整 @${start}`)
  if (buf.readUInt32LE(start) !== MAGIC) throw new Error(`bad magic @${start}`)
  const fhd = buf[start + 4]
  const fcsFlag = fhd >> 6
  const singleSegment = (fhd & 0x20) !== 0
  const reserved = (fhd & 0x08) !== 0
  const hasChecksum = (fhd & 0x04) !== 0
  const didFlag = fhd & 0x03
  if (reserved) throw new Error(`保留位被置位 @${start}`)
  let q = start + 5
  if (!singleSegment) q += 1 // Window_Descriptor
  q += [0, 1, 2, 4][didFlag] // Dictionary_ID
  q += [singleSegment ? 1 : 0, 2, 4, 8][fcsFlag] // Frame_Content_Size
  let last = false
  while (!last) {
    if (q + 3 > buf.length) throw new Error(`block header 越界 @${q}`)
    const bh = buf.readUIntLE(q, 3)
    q += 3
    last = (bh & 1) === 1
    const type = (bh >> 1) & 3
    const size = bh >> 3
    if (type === 3) throw new Error(`非法 block type @${q - 3}`)
    q += type === 0 ? 1 : size
  }
  if (hasChecksum) q += 4
  if (q > buf.length) throw new Error(`帧尾越界 @${start}`)
  return q
}

/**
 * 顺着头扫：遇到坏 magic 就按字节向前探，直到重新对齐到一个能完整解压的帧。
 * 这样能跳过"被写坏的中间帧"，保住后面的数据。
 *
 * 注意：DSH 的 append 批次本身由「明文 JSON 行 + zstd 帧」交替组成，
 * 因此帧与帧之间夹着的几十字节明文是**正常格式**，这里单独标记成 stub，
 * 不当成损坏；只有解不出来的帧才算损坏。
 */
export function scan(buf) {
  const frames = []
  let off = 0
  while (off + 4 <= buf.length) {
    if (buf.readUInt32LE(off) !== MAGIC) {
      // 重新对齐：尝试下一个 magic
      let next = off + 1
      while (next + 4 <= buf.length && buf.readUInt32LE(next) !== MAGIC) next++
      const raw = buf.subarray(off, next).toString('utf8')
      const looksLikeJsonLine = /^\s*\{.*\}\s*$/s.test(raw) && raw.includes('"type"')
      frames.push({
        offset: off,
        end: next,
        size: next - off,
        ok: looksLikeJsonLine,
        kind: looksLikeJsonLine ? 'stub' : 'garbage',
        text: looksLikeJsonLine ? raw : undefined,
        reason: looksLikeJsonLine ? 'plain stub line' : 'garbage/plaintext',
      })
      off = next
      continue
    }
    let end
    try {
      end = frameEnd(buf, off)
    } catch (error) {
      frames.push({ offset: off, end: off + 4, size: 4, ok: false, reason: String(error.message) })
      off += 1
      continue
    }
    let text
    try {
      text = zlib.zstdDecompressSync(buf.subarray(off, end)).toString('utf8')
    } catch (error) {
      frames.push({ offset: off, end, size: end - off, ok: false, reason: `decompress: ${error.message}` })
      off = end
      continue
    }
    frames.push({ offset: off, end, size: end - off, ok: true, text })
    off = end
  }
  return frames
}

/** 从帧文本里挑出完整、可 JSON.parse 的行；统计重复 seq。 */
function linesOf(frames) {
  const lines = []
  const dupSeq = []
  const seen = new Set()
  for (const frame of frames) {
    if (!frame.ok || frame.text === undefined) continue
    for (const line of frame.text.split('\n')) {
      if (!line.trim()) continue
      let value
      try {
        value = JSON.parse(line)
      } catch {
        continue // 撕裂的尾行
      }
      if (typeof value.seq === 'number') {
        if (seen.has(value.seq)) dupSeq.push(value.seq)
        seen.add(value.seq)
      }
      lines.push({ line, value })
    }
  }
  return { lines, dupSeq }
}

function compressOneFrame(text) {
  const compress = zlib.createZstdCompress({ params: { [zlib.constants.ZSTD_c_checksumFlag]: 1 } })
  const chunks = []
  return new Promise((resolve, reject) => {
    compress.on('data', (chunk) => chunks.push(chunk))
    compress.on('end', () => resolve(Buffer.concat(chunks)))
    compress.on('error', reject)
    compress.write(Buffer.from(text, 'utf8'))
    compress.end()
  })
}

const [, , command, input, output, ...flags] = process.argv
const force = flags.includes('--force')

if (command === undefined || input === undefined) {
  console.log(`用法:
  node bin.mjs scan    <session.v4.jsonl.zstd>
  node bin.mjs dump    <session.v4.jsonl.zstd> <out.jsonl>          [--force]
  node bin.mjs recover <session.v4.jsonl.zstd> <out.v4.jsonl.zstd>  [--force]`)
  process.exit(1)
}

const buf = readFileSync(input)
const frames = scan(buf)
const dataFrames = frames.filter((frame) => frame.kind !== 'stub')
const good = frames.filter((frame) => frame.ok && frame.kind !== 'stub')
const stubs = frames.filter((frame) => frame.kind === 'stub')
const bad = frames.filter((frame) => !frame.ok && frame.kind !== 'stub')
const { lines, dupSeq } = linesOf(frames)
const head = lines.find((item) => item.value.type === 'session')

if (command === 'scan') {
  console.log(`文件: ${input}`)
  console.log(`字节: ${buf.length}`)
  console.log(`帧: ${dataFrames.length}（可解 ${good.length}，损坏 ${bad.length}）  + 明文 stub 行 ${stubs.length}（正常格式）`)
  console.log(`事件行: ${lines.length}（重复 seq: ${dupSeq.length === 0 ? '无' : dupSeq.join(',')}）`)
  if (head) console.log(`会话: ${head.value.id}  cwd=${head.value.cwd}`)
  const lostBytes = bad.reduce((sum, frame) => sum + frame.size, 0)
  if (bad.length > 0) console.log(`损坏字节合计: ${lostBytes}`)
  console.log('帧明细（只列损坏帧与最后 3 个可用帧）:')
  for (const frame of bad) {
    console.log(`  BAD  @${frame.offset}..${frame.end} (${frame.size}B)  ${frame.reason}`)
  }
  for (const frame of good) console.log(`  ok   @${frame.offset}..${frame.end} (${frame.size}B) 行=${frame.text.split('\n').filter(Boolean).length}`)
  if (bad.length > 0) {
    console.log(`\n结论: 有 ${bad.length} 个帧解不开（共 ${lostBytes} 字节），其中的事件无法还原；`)
    console.log('      其余事件可正常取出 —— 用 `dump` 导出明文，用 `recover` 生成可重新加载的副本。')
  } else {
    console.log('\n结论: 所有帧都能解压，没有发现结构性损坏。')
  }
  process.exit(0)
}

if (output === undefined) {
  console.error('缺少输出路径')
  process.exit(1)
}
if (!force && existsSync(output)) {
  console.error(`输出已存在，未覆盖: ${output}（加 --force 覆盖）`)
  process.exit(1)
}

if (command === 'dump') {
  writeFileSync(output, lines.map((item) => item.line).join('\n') + '\n')
  console.log(`已导出 ${lines.length} 行（含撕裂/坏帧中丢失的事件）-> ${output}`)
  process.exit(0)
}

if (command === 'recover') {
  if (!head) {
    console.error('第一帧里没有会话头（type: "session"），无法恢复。')
    process.exit(1)
  }
  // 会话头必须是最早那一行；事件按扫描顺序拼接，跳过重复 seq 的副本
  const seen = new Set()
  const kept = []
  for (const item of lines) {
    if (item.value.type === 'session') continue
    const seq = typeof item.value.seq === 'number' ? item.value.seq : undefined
    if (seq !== undefined) {
      if (seen.has(seq)) continue
      seen.add(seq)
    }
    kept.push(item.line)
  }
  const payload = JSON.stringify(head.value) + '\n' + kept.join('\n') + '\n'
  const frame = await compressOneFrame(payload)
  writeFileSync(output, frame)
  const back = zlib.zstdDecompressSync(readFileSync(output)).toString('utf8')
  console.log(`已写出 ${output}`)
  console.log(`  事件: ${kept.length}  单帧字节: ${frame.length}  自检解压一致: ${back === payload}`)
  if (bad.length > 0) console.log(`  注意: 有 ${bad.length} 个损坏帧的事件无法恢复（DSH 已写入的原始文件不受影响）`)
  process.exit(back === payload ? 0 : 1)
}

console.error(`未知命令: ${command}`)
process.exit(1)
