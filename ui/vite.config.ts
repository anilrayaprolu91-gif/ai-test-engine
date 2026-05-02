import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const parsed: Record<string, string> = {}
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    parsed[key] = value
  }

  return parsed
}

const fileEnv = parseEnvFile(path.resolve(__dirname, '..', 'required.env'))
const mergedEnv = {
  ...fileEnv,
  ...process.env,
}

const clientEnv = Object.fromEntries(
  Object.entries(mergedEnv)
    .filter(([key]) => key.startsWith('VITE_'))
    .map(([key, value]) => [key, value ?? ''])
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: Object.fromEntries(
    Object.entries(clientEnv).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
  ),
})
