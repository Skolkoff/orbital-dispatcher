import assert from 'node:assert/strict'
import test from 'node:test'
import { URL } from 'node:url'
import { build, preview } from 'vite'

test('production preview serves the generated script URL as JavaScript', async () => {
  await build()
  const server = await preview({
    preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
  })

  try {
    const address = server.httpServer.address()
    assert.ok(address && typeof address === 'object')
    const origin = `http://127.0.0.1:${address.port}`
    const page = await globalThis.fetch(`${origin}/app/`)
    assert.equal(page.status, 200)
    const html = await page.text()
    const scriptPath = html.match(/<script\b[^>]*\bsrc="([^"]+)"/u)?.[1]
    assert.ok(scriptPath, 'built HTML must reference the application script')

    const script = await globalThis.fetch(new URL(scriptPath, page.url))
    assert.equal(script.status, 200)
    assert.match(script.headers.get('content-type') ?? '', /(?:application|text)\/javascript/u)
    assert.notEqual(await script.text(), html, 'script URL must not return the SPA fallback')
  } finally {
    server.httpServer.closeAllConnections()
    await new Promise((resolve, reject) => {
      server.httpServer.close(error => error ? reject(error) : resolve())
    })
  }
})
