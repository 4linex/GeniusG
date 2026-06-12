import { spawn } from 'node:child_process'

const isWin = process.platform === 'win32'

function run(command, args, label) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: isWin,
  })
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${label}] encerrou com código ${code}`)
    }
  })
  return child
}

const functions = run('npx', ['supabase', 'functions', 'serve'], 'functions')
const vite = run('npm', ['run', 'dev'], 'vite')

function shutdown() {
  functions.kill()
  vite.kill()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
