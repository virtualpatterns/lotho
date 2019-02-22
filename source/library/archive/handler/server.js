import CORS from 'restify-cors-middleware'
import { Log, Process } from '@virtualpatterns/mablung'
import Property from 'object-path'
import REST from 'restify'

import Configuration from '../../../configuration'
import Handler from '../handler'
import Package from '../../../../package.json'

import Status from './route/status'

const handlerPrototype = Handler.getHandlerPrototype()
const serverPrototype = Object.create(handlerPrototype)

serverPrototype.onScheduled = async function () {

  try {
    await new Promise((resolve, reject) => {

      this.server.once('error', this.onScheduledError = (error) => {
        reject(error)
      })

      this.server.listen(this.archive.option.server.port, this.archive.option.server.address, () => {
        Log.debug(`Listening at http://${this.archive.option.server.address}:${this.archive.option.server.port}`)

        this.server.off('error', this.onScheduledError)
        resolve()

      })

    })
  }
  catch (error) {
    Log.error(error, 'Server.onScheduled()')
  }

}

serverPrototype.onStarted = function (stamp) {

  try {
    this.archive.option.currentStamp = stamp
  }
  catch (error) {
    Log.error(error, `Server.onStarted('${stamp.toFormat(Configuration.format.stamp)}')`)
  }

}

serverPrototype.onFinished = function () {

  try {
    this.archive.option.currentStamp = null
  }
  catch (error) {
    Log.error(error, 'Server.onFinished()')
  }

}

serverPrototype.onSucceeded = function (result) {

  try {
    this.archive.option.lastResult = result
    this.archive.option.lastError = null
  }
  catch (error) {
    Log.error(error, 'Server.onSucceeded()')
  }

}

serverPrototype.onFailed = function (error) {

  try {
    this.archive.option.lastResult = null
    this.archive.option.lastError = error
  }
  catch (error) {
    Log.error(error, 'Server.onFailed()')
  }

}

serverPrototype.onUnscheduled = async function () {

  try {
    await new Promise((resolve, reject) => {

      this.server.once('error', this.onUnscheduledError = (error) => {
        reject(error)
      })

      this.server.close(() => {
        Log.debug(`Closed http://${this.archive.option.server.address}:${this.archive.option.server.port}`)

        this.server.off('error', this.onUnscheduledError)
        resolve()

      })

    })
  }
  catch (error) {
    Log.error(error, 'Server.onUnscheduled()')
  }

}

const Server = Object.create(Handler)

Server.createHandler = function (archive, prototype = serverPrototype) {

  let server = Handler.createHandler.call(this, archive, prototype)

  server.server = this.createServer(archive)

  Property.set(archive.option, 'server.address', Property.get(archive.option, 'server.address', Configuration.server.address))
  Property.set(archive.option, 'server.port', Property.get(archive.option, 'server.port', Configuration.server.port))
  
  archive.option.currentStamp = null
  archive.option.lastResult = null
  archive.option.lastError = null

  return server

}

Server.getHandlerPrototype = function () {
  return serverPrototype
}

Server.isHandler = function (server) {
  return serverPrototype.isPrototypeOf(server)
}

Server.createServer = function (archive) {

  let cors = CORS(Configuration.getOption(Configuration.option.CORS))

  let server = REST.createServer({
    'name': `Node.js ${Process.version} ${Package.name} ${Package.version}`
  })

  server.on('error', (error) => {
    Log.error(error, 'Server.on(\'error\', (error) => { ... })')
  })

  server.on('restifyError', (request, response, error, callback) => {
    Log.error(error, 'Server.on(\'restifyError\', (request, response, error, callback) => { ... })')
    return callback()
  })

  server.pre(REST.plugins.pre.userAgentConnection())
  server.pre(cors.preflight)

  server.use(REST.plugins.queryParser({}))
  server.use(REST.plugins.bodyParser({}))
  server.use(cors.actual)

  server.use((request, response, next) => {
    Log.debug(`${request.method} ${request.url} ${request.header('X-Forwarded-For', request.socket.remoteAddress)} ${request.header('User-Agent')}`)
    return next()
  })

  Status.createRoute(server, archive)

  return server

}

export default Server
