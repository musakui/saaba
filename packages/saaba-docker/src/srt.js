import { EventEmitter } from 'events'

import * as obs from './obs.js'
import { log, run } from './utils.js'

const parse = (obj, f = parseInt) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, f(v)]))

const minPort = 1900
const maxPort = 1999

const srtParams = {
  mode: 'listener',
}

const defaultSettings = {
  buffering_mb: 1,
  is_local_file: false,
  input_format: 'mpegts',
  reconnect_delay_sec: 1,
  restart_on_activate: true,
  clear_on_media_end: false,
}

export const ports = new Map()
export const info = new Map()

const udpPorts = new Set()
const udpPortStart = 10000
const getPort = (p = udpPortStart) => {
  while (udpPorts.has(p)) { ++p }
  udpPorts.add(p)
  return p
}

let counter = 0

class SLT extends EventEmitter {
  constructor (opts) {
    const port = parseInt(opts.port)
    if (isNaN(port)) throw new Error('invalid port')
    if (ports.has(port)) throw new Error(`port ${port} in use`)
    if (port < minPort || port > maxPort) throw new Error(`port out of range (${minPort} - ${maxPort})`)
    super()
    this._port = port
    this._name = opts.name || `srt-${++counter}`
    this._scene = opts.scene || 'main'
    this._sceneZ = opts.sceneZ ?? null
    this._refresh = opts.refresh || 2000
    this._params = Object.assign({}, srtParams, opts.params)
    this._srcUrl = `srt://:${this._port}/?${new URLSearchParams(this._params)}`

    this._udpPort = getPort()
    const udpQs = new URLSearchParams(opts.udp || {})
    const input = `udp://127.0.0.1:${this._udpPort}?${udpQs}`
    this._sourceSettings = Object.assign({ input }, defaultSettings, opts.source)
    this._dstUrl = input

    this._sceneProps = opts.sceneProperties || {}

    this._stats = {}
    this._proc = null
    this._itemId = null
    this._running = false
    this._readyPromise = this._init()
  }

  get ready () {
    return this._readyPromise
  }

  get stats () {
    return this._stats
  }

  get info () {
    return {
      port: this._port,
      params: this._params,
      refresh: this._refresh,
      source: {
        id: this._itemId,
        name: this._name,
        scene: this._scene,
      },
    }
  }

  get running () {
    return this._running
  }

  async _init () {
    const proc = await run('slt', [
      '-pf', 'json', '-s', this._refresh,
      this._srcUrl,
      this._dstUrl,
    ])

    const pid = proc.pid
    ports.set(this._port, pid)

    proc.on('exit', () => {
      this._running = false
      this.removeSource()
      this.emit('info', { type: 'close' })
      info.delete(pid)
      ports.delete(this._port)
      udpPorts.delete(this._udpPort)
      log('[SRT]', pid, 'exit')
    })

    proc.stderr.on('data', (d) => {
      const message = d.toString().trim()
      if (!message) return
      let type = null
      switch (message) {
        case 'Accepted SRT source connection':
          type = 'connect'
          this.setProps({ visible: true })
          break
        case 'SRT source disconnected':
          type = 'disconnect'
          this.setProps({ visible: false })
          break
        default:
          break
      }
      this.emit('info', { type, message })
    })

    proc.stdout.on('data', (d) => {
      const {
        sid, send, recv, link,
        time, timepoint, window,
      } = JSON.parse(d.toString().replace(/,\s+$/, ''))
      Object.assign(this._stats, {
        time: parseInt(time), timepoint,
        link: parse(link, parseFloat),
        send: parse(send),
        recv: parse(recv),
        window: parse(window),
      })
      this.emit('stat', this._stats)
    })

    this._proc = proc
    this._running = true
    this._stats.time = 0
    info.set(pid, this)

    await this.addSource()
    log('[SRT]', pid, 'port:', this._port)
    return true
  }

  async addSource () {
    const { itemId } = await obs.ws.$.CreateSource({
      sourceKind: 'ffmpeg_source',
      sourceName: this._name,
      sceneName: this._scene,
      sourceSettings: this._sourceSettings,
      setVisible: false,
    })
    this._itemId = itemId

    if (!this._sceneProps.bounds) {
      const info = await obs.ws.$.GetVideoInfo()
      this._sceneProps.bounds = {
        type: 'OBS_BOUNDS_SCALE_INNER',
        x: info.baseWidth,
        y: info.baseHeight,
      }
    }

    await this.setProps(this._sceneProps)
    await obs.setItemZ(itemId, this._sceneZ, this._scene)
  }

  async removeSource () {
    await obs.ws.$.DeleteSceneItem({
      scene: this._scene,
      item: { id: this._itemId },
    })
  }

  async setProps (props) {
    await obs.ws.$.SetSceneItemProperties({
      'scene-name': this._scene,
      item: this._name,
      ...props,
    })
  }

  kill () {
    this._proc?.kill()
  }
}

const srtRegex = /^\/srt\/(\w+)$/

const getProc = (url) => {
  const port = url.match(srtRegex)?.[1]
  const pid = ports.get(parseInt(port))
  if (!pid) throw new Error('port not in use')
  const proc = info.get(pid)
  if (!proc) throw new Error('no such id')
  return proc
}

export const create = async (opts) => {
  const s = new SLT(opts)
  await s.ready
  return s
}

export const listen = async (url, res = null, run = true) => {
  const proc = getProc(url)
  const queue = []
  const notify = () => {
    if (!res) return
    res()
    res = null
  }
  const onEvent = (evt) => (queue.push(evt), notify())
  proc.on('stat', onEvent)
  proc.on('info', onEvent)
  async function * stream () {
    yield proc.stats
    while (run && proc.running) {
      await new Promise((resolve) => { res = resolve })
      while (queue.length) yield queue.shift()
    }
  }
  return {
    [Symbol.asyncIterator]: stream,
    close: () => {
      run = false
      notify()
      proc.off('stat', onEvent)
      proc.off('info', onEvent)
    },
  }
}

export const remove = async (url) => {
  try {
    getProc(url).kill()
    return { message: 'killed' }
  } catch (er) {
    return { message: er.message }
  }
}
