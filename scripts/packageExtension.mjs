import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { deflateRawSync } from 'node:zlib'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
// Explicit public-file list: never package local credentials or test fixtures.
const files = ['manifest.json', 'capture.js', 'report.html', 'report.css', 'report.js', 'core.mjs', 'README.md']
function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
const local = [], central = []
let offset = 0
for (const name of files) {
  const data = await readFile(path.join(root, 'browser-extension', name))
  const compressed = deflateRawSync(data), filename = Buffer.from(name), crc = crc32(data)
  const header = Buffer.alloc(30)
  header.writeUInt32LE(0x04034b50, 0)
  header.writeUInt16LE(20, 4)
  header.writeUInt16LE(8, 8)
  header.writeUInt16LE(0x5c21, 12) // Fixed ZIP date for reproducible builds.
  header.writeUInt32LE(crc, 14)
  header.writeUInt32LE(compressed.length, 18)
  header.writeUInt32LE(data.length, 22)
  header.writeUInt16LE(filename.length, 26)
  local.push(header, filename, compressed)
  const entry = Buffer.alloc(46)
  entry.writeUInt32LE(0x02014b50, 0)
  entry.writeUInt16LE(20, 4)
  entry.writeUInt16LE(20, 6)
  entry.writeUInt16LE(8, 10)
  entry.writeUInt16LE(0x5c21, 14)
  entry.writeUInt32LE(crc, 16)
  entry.writeUInt32LE(compressed.length, 20)
  entry.writeUInt32LE(data.length, 24)
  entry.writeUInt16LE(filename.length, 28)
  entry.writeUInt32LE(offset, 42)
  central.push(entry, filename)
  offset += header.length + filename.length + compressed.length
}
const directory = Buffer.concat(central), end = Buffer.alloc(22)
end.writeUInt32LE(0x06054b50, 0)
end.writeUInt16LE(files.length, 8)
end.writeUInt16LE(files.length, 10)
end.writeUInt32LE(directory.length, 12)
end.writeUInt32LE(offset, 16)
const destination = path.join(root, 'public/downloads')
await mkdir(destination, { recursive: true })
await writeFile(path.join(destination, 'qa-lab-bug-capture.zip'), Buffer.concat([...local, directory, end]))
console.log(`Packaged QA Lab Bug Capture (${files.length} files).`)
