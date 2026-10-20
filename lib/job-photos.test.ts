import sharp from 'sharp'
import {
  JOB_PHOTO_JPEG_QUALITY,
  JOB_PHOTO_MAX_EDGE,
  incomingPhotoId,
  prepareJobPhoto,
} from './job-photos'
import { detectImageMime, validateExpensePhotoBuffer } from './expense-photo-storage'
import { EXPENSE_PHOTO_MAX_BYTES } from './expense-photos'

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`✓ ${name}`)
  } catch (error) {
    failed++
    console.error(`✗ ${name}`)
    console.error(error)
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

console.log('\n🗄️ Job photo storage tests\n')

async function main() {
  await test('original size and type limits stay in place', () => {
    const ok = validateExpensePhotoBuffer(PNG_1x1)
    assert(ok.ok && ok.contentType === 'image/png', 'png accepted before compress')
    assert(detectImageMime(PNG_1x1) === 'image/png', 'png detected')
    const tooBig = validateExpensePhotoBuffer(Buffer.alloc(EXPENSE_PHOTO_MAX_BYTES + 1, 0xff))
    assert(!tooBig.ok, 'over 8 MB rejected')
    const bad = validateExpensePhotoBuffer(Buffer.from('not-an-image-file-here'))
    assert(!bad.ok, 'text rejected')
  })

  await test('photos are resized to 1600px and stored as JPEG ~80%', async () => {
    const large = await sharp({
      create: { width: 2400, height: 1800, channels: 3, background: { r: 196, g: 42, b: 42 } },
    })
      .png()
      .toBuffer()
    const prepared = await prepareJobPhoto(large)
    assert(prepared.ok, 'compress should succeed')
    if (!prepared.ok) return
    assert(prepared.contentType === 'image/jpeg', prepared.contentType)
    const info = await sharp(prepared.data).metadata()
    assert((info.width || 0) <= JOB_PHOTO_MAX_EDGE, `width ${info.width}`)
    assert((info.height || 0) <= JOB_PHOTO_MAX_EDGE, `height ${info.height}`)
    assert(info.format === 'jpeg', String(info.format))
    assert(prepared.size < large.length, 'compressed is smaller than the original')
    assert(JOB_PHOTO_JPEG_QUALITY === 80, 'jpeg quality is 80')
  })

  await test('tiny photos are kept as JPEG without being enlarged', async () => {
    const prepared = await prepareJobPhoto(PNG_1x1)
    assert(prepared.ok, '1x1 png compresses')
    if (!prepared.ok) return
    const info = await sharp(prepared.data).metadata()
    assert(info.width === 1 && info.height === 1, `${info.width}x${info.height}`)
    assert(info.format === 'jpeg', String(info.format))
  })

  await test('submit payload uses photo ids, not disk paths', () => {
    assert(incomingPhotoId({ id: 'photo-1' }) === 'photo-1', 'id')
    assert(incomingPhotoId({ path: 'expenses/job/user/a.jpg' }) === null, 'disk path is not accepted')
    assert(incomingPhotoId({}) === null, 'empty')
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
