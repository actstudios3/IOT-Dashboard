'use strict'

import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import {spawn} from 'child_process'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000,
    // autoHideMenuBar: true,
    // title: 'Vmail',
    // disableAutoHideCursor: true,
    frame: false
  })

  mainWindow.loadURL(winURL)

  mainWindow.maximize()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

let children = []
function runScript (caller, script) {
  const child = spawn(process.execPath, [path.join(__static, 'runner.js')], {stdio: [0, 1, 2, 'ipc']}, (error, stdout, stderr) => {
    if (error) {
      throw error
    }
    // console.log(stdout)
    // console.log(stderr)
  })
  child.on('message', function (m) {
    caller.send('asynchronous-reply', m)
  })
  child.on('disconnect', function (m) {
    // caller.send('asynchronous-reply', `script ${script} exits`)
    stopScript(caller, script)
  })
  child.send(script)

  return child
}

function stopScript (caller, scriptName) {
  let found
  children.forEach((c, i) => {
    if (c.name === scriptName) {
      found = i
    }
  })
  if (found !== undefined) {
    process.kill(children[found].child.pid, 'SIGINT')
    children.splice(found, 1)
  }
}

ipcMain.on('asynchronous-message', (event, arg) => {
  if (arg.script) {
    let {command, value} = arg.script
    switch (command) {
      case 'run':
        let child = runScript(event.sender, value)
        children.push({name: value, child: child})
        break
      case 'stop':
        stopScript(event.sender, value)
        break
      default:
        console.log('unknown script command')
    }
  }
  // event.sender.send('asynchronous-reply', arg)
})

ipcMain.on('synchronous-message', (event, arg) => {
  event.returnValue = arg
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
