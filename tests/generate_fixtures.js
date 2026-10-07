const AdmZip = require('adm-zip')
const fs = require('fs')
const path = require('path')

const fixturesDir = path.join(__dirname, 'fixtures')
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true })
}

// 1. safe-project.zip
const safeZip = new AdmZip()
safeZip.addFile('main.cpp', Buffer.from('int main() { return 0; }'))
safeZip.addFile('utils/helpers.ts', Buffer.from('export const test = 1;'))
safeZip.writeZip(path.join(fixturesDir, 'safe-project.zip'))

// 2. traversal.zip (../)
const traversalZip = new AdmZip()
// AdmZip might sanitize, so we construct raw headers if needed, but let's try direct addFile first
// Actually adm-zip doesn't sanitize addFile name, it just writes it to the local header.
traversalZip.addFile('../escaped.txt', Buffer.from('malicious'))
traversalZip.writeZip(path.join(fixturesDir, 'traversal.zip'))

// 3. absolute-path.zip
const absZip = new AdmZip()
absZip.addFile('/absolute/path.txt', Buffer.from('malicious'))
absZip.addFile('C:\\Windows\\System32\\calc.exe', Buffer.from('malicious'))
absZip.writeZip(path.join(fixturesDir, 'absolute-path.zip'))

// 4. oversized-project.zip (we will mock limits in tests, but let's make a slightly larger one)
const overZip = new AdmZip()
overZip.addFile('large.txt', Buffer.alloc(1024 * 1024 * 2)) // 2MB
overZip.writeZip(path.join(fixturesDir, 'oversized-project.zip'))

console.log('Fixtures generated.')
