import { readFileSync } from 'fs'
import { join } from 'path'

describe('mobile attendance current-status contract', () => {
  it('uses the dedicated status endpoint instead of deriving status from history', () => {
    const content = readFileSync(
      join(process.cwd(), 'app', '(app)', 'absensi.tsx'),
      'utf8'
    )

    expect(content).toContain('/api/mobile/attendance/status')
    expect(content).not.toContain('/api/mobile/attendance/history?limit=1')
  })
})
