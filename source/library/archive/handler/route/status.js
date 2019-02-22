import Error from 'restify-errors'
import Format from 'human-format'
import { Log, Process } from '@virtualpatterns/mablung'
import Schedule from 'cronstrue'

import Configuration from '../../../../configuration'
import Is from '../../../utility/is'
import Package from '../../../../../package.json'

const Status = Object.create({})

Status.createRoute = function (server, archive) {

  server.head('/api/status', (request, response, next) => {
    response.send(200, {})
    return next()
  })

  server.get('/api/status', async (request, response, next) => {

    try {

      let memory = Process.memoryUsage()

      let currentStamp = Is.not.null(archive.option.currentStamp) ? archive.option.currentStamp.toFormat(Configuration.format.stamp) : '(not started)'

      let lastResult = null
      let lastError = null

      if (Is.not.null(archive.option.lastResult)) {

        lastResult = {
          'stamp': archive.option.lastResult.stamp.toFormat(Configuration.format.stamp),
          'statistic': archive.option.lastResult.statistic
        }
        lastError = '(succeeded)'

      }
      else if (Is.not.null(archive.option.lastError)) {

        lastResult = '(failed)'
        lastError = {
          'message': archive.option.lastError.message,
          'stack': archive.option.lastError.stack
        }

      }
      else {
        lastResult = '(not succeeded)'
        lastError = '(not failed)'
      }

      let status = {
        'address': {
          'remote': request.socket.remoteAddress,
          'forwarded': request.header('X-Forwarded-For') || '(none)'
        },
        'agent': request.header('User-Agent') || '(none)',
        'currentStamp': currentStamp,
        'heap': {
          'total': Format(memory.heapTotal, Configuration.format.byte),
          'used': Format(memory.heapUsed, Configuration.format.byte)
        },
        'lastError': lastError,
        'lastResult': lastResult,
        'name': archive.option.name,
        'now': Configuration.now().toFormat(Configuration.format.stamp),
        'package': {
          'name': Package.name,
          'version': Package.version
        },
        'path': archive.option.path,
        'schedule': Schedule.toString(archive.option.schedule, true)
      }

      response.noCache()
      response.send(status)

      return next()

    }
    catch (error) {
      Log.error(error, 'server.get(\'/api/status\', (request, response, next) => { ... })')
      return next(new Error.InternalServerError())
    }

  })

}

export default Status
