// Lets Node run the app's TypeScript sources directly (Node 24 strips the types itself):
// `node --import ./scripts/ts-resolve.mjs scripts/<script>.ts`. The sources import siblings
// without an extension, as Vite allows, so the missing ".ts" is added here.
import { register } from 'node:module'

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        try {
          return await next(specifier, context)
        } catch (err) {
          if (!specifier.startsWith('.') || /\\.[cm]?[jt]sx?$/.test(specifier)) throw err
          for (const ext of ['.ts', '.tsx', '/index.ts']) {
            try {
              return await next(specifier + ext, context)
            } catch {}
          }
          throw err
        }
      }
    `),
  import.meta.url,
)
