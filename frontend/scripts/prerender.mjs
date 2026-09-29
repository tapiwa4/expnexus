// Runs after both the client and SSR builds. Renders each route to a real HTML
// string and writes it as a static file, so crawlers that don't execute
// JavaScript (many AI crawlers, some search bots) see actual page content
// instead of an empty <div id="root">. The client bundle still hydrates on top
// for full interactivity once JS loads.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDir = path.resolve(__dirname, '../dist/client')
const serverEntry = path.resolve(__dirname, '../dist/server/entry-server.js')

const template = fs.readFileSync(path.join(clientDir, 'index.html'), 'utf-8')
const { render, routeMeta } = await import(pathToFileURL(serverEntry).href)

const routes = Object.keys(routeMeta)

for (const route of routes) {
  const appHtml = render(route)
  const meta = routeMeta[route]

  const html = template
    .replace('<!--app-html-->', appHtml)
    .replace(
      '<!--app-head-->',
      `<meta name="generated-for" content="${route}" />`,
    )
    .replace(/<title>.*?<\/title>/, `<title>${meta.title}</title>`)
    .replace(
      /<meta name="description" content=".*?" \/>/,
      `<meta name="description" content="${meta.description.replace(/"/g, '&quot;')}" />`,
    )

  const outDir = route === '/' ? clientDir : path.join(clientDir, route)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'index.html'), html)
  console.log(`prerendered ${route} -> ${path.relative(clientDir, path.join(outDir, 'index.html'))}`)
}

// The SSR-only server bundle isn't needed at runtime — nginx just serves static files.
fs.rmSync(path.resolve(__dirname, '../dist/server'), { recursive: true, force: true })

console.log(`Prerendered ${routes.length} route(s).`)
