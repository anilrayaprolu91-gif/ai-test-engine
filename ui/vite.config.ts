import path from 'node:path'
import dotenv from 'dotenv'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

dotenv.config({ path: path.resolve(__dirname, '..', 'required.env') })

const clientEnv = Object.fromEntries(
  Object.entries(process.env)
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
