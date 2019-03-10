import { assert as Assert } from 'chai'
import { Duration } from 'luxon'
import Request from 'axios'

import Configuration from '../../../../configuration'
import Local from '../../../../library/archive/local'
import Server from '../../../../library/archive/handler/server'

import { ArchiveArchiveError } from '../../../../library/error/archive-error'
import { RequestSucceededError } from '../../../error/test-error'

const STATUS_SCHEMA = {
  'title': 'Status',
  'type': 'object',
  'properties': {
    'address': {
      'name': 'Status-Address',
      'type': 'object',
      'properties': {
        'remote': { 'type': 'string' },
        'forwarded': { 'type': 'string' }
      },
      'required': [ 'remote', 'forwarded' ],
      'additionalProperties': false
    },
    'agent': { 'type': 'string' },
    'currentStamp': { 'type': 'string' },
    'heap': {
      'name': 'Status-Heap',
      'type': 'object',
      'properties': {
        'total': { 'type': 'string' },
        'used': { 'type': 'string' }
      },
      'required': [ 'total', 'used' ],
      'additionalProperties': false
    },
    'lastDuration': { 'type': 'string' },
    'lastError': {
      'oneOf': [
        { 'type': 'string' },
        {
          'name': 'Status-Error',
          'type': 'object',
          'properties': {
            'message': { 'type': 'string' },
            'stack': { 'type': 'string' }
          },
          'required': [ 'message', 'stack' ],
          'additionalProperties': false
        }
      ]
    },
    'lastResult': {
      'oneOf': [
        { 'type': 'string' },
        {
          'name': 'Status-Result',
          'type': 'object',
          'properties': {
            'stamp': { 'type': 'string' },
            'statistic': {
              'name': 'Status-Result-Statistic',
              'type': 'object',
              'properties': {
                'countOfScanned': { 'type': 'integer' },
                'countOfCreated': { 'type': 'integer' },
                'countOfUpdated': { 'type': 'integer' },
                'countOfDeleted': { 'type': 'integer' },
                'countOfPurged': { 'type': 'integer' }
              },
              'required': [ 'countOfScanned', 'countOfCreated', 'countOfUpdated', 'countOfPurged' ],
              'additionalProperties': false
            }
          },
          'required': [ 'stamp', 'statistic' ],
          'additionalProperties': false
        }
      ]
    },
    'name': { 'type': 'string' },
    'nextSchedule': { 'type': 'string' },
    'now': { 'type': 'string' },
    'package': {
      'name': 'Status-Package',
      'type': 'object',
      'properties': {
        'name': { 'type': 'string' },
        'version':  { 'type': 'string' }
      },
      'required': [ 'name', 'version' ],
      'additionalProperties': false
    },
    'path': {
      'name': 'Status-Path',
      'type': 'object',
      'properties': {
        'home': { 'type': 'string' },
        'source': {
          'type': 'array',
          'items': { 'type': 'string' },
          'uniqueItems': false
        },
        'target':  { 'type': 'string' },
        'include':  {
          'type': 'array',
          'items': { 'type': 'string' },
          'uniqueItems': false
        },
        'exclude':  {
          'type': 'array',
          'items': { 'type': 'string' },
          'uniqueItems': false
        }
      },
      'required': [ 'home', 'source', 'target', 'include', 'exclude' ],
      'additionalProperties': false
    },
    'schedule': { 'type': 'string' },
    'version':  { 'type': 'string' }
  },
  'required': [ 'address', 'agent', 'currentStamp', 'heap', 'lastError', 'lastResult', 'name', 'nextSchedule', 'now', 'package', 'path', 'schedule', 'version' ],
  'additionalProperties': false
}

describe('server', function () {

  let request = null

  before(function () {
    request = Request.create(Configuration.getOption({ 'baseURL': 'http://0.0.0.0:4567' }, Configuration.test.option.request))
  })

  describe('(with an empty source)', function () {

    let option = null
    let archive = null
    let server = null
  
    before(async function () {
  
      Configuration.merge(Configuration.path.configuration)
  
      let rootPath = 'resource/test/library/archive/empty'

      option = {
        'name': this.test.parent.title,
        'path': {
          'source': `${rootPath}/source`,
          'target': `${rootPath}/target`
        },
        'schedule': '*/5 * * * * *'
      }
  
      archive = Local.createArchive(option)
      server = Server.createHandler(archive)
  
    })
  
    describe('onScheduled()', function () {
  
      before(function() {
        return server.onScheduled()
      })

      describe('/api/status', function () {

        describe('HEAD', function () {
  
          it('should respond with 200 OK', async function () {
            Assert.equal((await request.head('/api/status')).status, 200)
          })
  
        })
  
        describe('GET', function () {
  
          let response = null
  
          before(async function () {
            response = await request.get('/api/status')
          })
  
          it('should respond with 200 OK', function () {
            Assert.equal(response.status, 200)
          })
  
          it('should be valid', function () {
            Assert.jsonSchema(response.data, STATUS_SCHEMA)
          })
  
          it('should be equal to \'(not started)\'', function () {
            Assert.equal(response.data.currentStamp, '(not started)')
          })
  
          it('should be equal to \'(not succeeded)\'', function () {
            Assert.equal(response.data.lastResult, '(not succeeded)')
          })
  
          it('should be equal to \'(not failed)\'', function () {
            Assert.equal(response.data.lastError, '(not failed)')
          })

        })
  
      })
  
      after(function() {
        return server.onUnscheduled()
      })
      
    })
  
    describe('onStarted(stamp)', function () {
  
      let stamp = null

      before(async function() {

        stamp = Configuration.now()

        await server.onScheduled()
        await server.onStarted(stamp)

      })

      describe('/api/status', function () {

        describe('GET', function () {

          let response = null
  
          before(async function () {
            response = await request.get('/api/status')
          })
  
          it('should be valid', function () {
            Assert.jsonSchema(response.data, STATUS_SCHEMA)
          })
  
          it('should be equal to the stamp', function () {
            Assert.equal(response.data.currentStamp, stamp.toFormat(Configuration.format.stamp))
          })
  
        })
  
      })
  
      after(async function() {
        await server.onUnscheduled()
      })
      
    })
  
    describe('onSucceeded(result)', function () {
  
      before(function() {
        return server.onScheduled()
      })

      describe('(with all non-zero values)', function () {
  
        let result = null

        before(function() {

          result = {
            'stamp': Configuration.now(),
            'statistic': {
              'countOfScanned': 1,
              'countOfCreated': 2,
              'countOfUpdated': 3,
              'countOfDeleted': 4,
              'countOfPurged': 5
            }
          }

          return server.onSucceeded(result)

        })
  
        describe('/api/status', function () {
  
          describe('GET', function () {
  
            let response = null
    
            before(async function () {
              response = await request.get('/api/status')
            })
    
            it('should be valid', function () {
              Assert.jsonSchema(response.data, STATUS_SCHEMA)
            })
    
            it('should be equal to the result', function () {
              Assert.deepEqual(response.data.lastResult.statistic, result.statistic)
            })
    
            it('should be equal to \'(succeeded)\'', function () {
              Assert.equal(response.data.lastError, '(succeeded)')
            })
    
          })
    
        })
    
      })
  
      after(function() {
        return server.onUnscheduled()
      })
      
    })
  
    describe('onFailed(error)', function () {

      let error = null
  
      before(async function() {
        await server.onScheduled()
        await server.onFailed(error = new ArchiveArchiveError())
      })

      describe('/api/status', function () {

        describe('GET', function () {

          let response = null
  
          before(async function () {
            response = await request.get('/api/status')
          })
  
          it('should be valid', function () {
            Assert.jsonSchema(response.data, STATUS_SCHEMA)
          })
  
          it('should be equal to \'(failed)\'', function () {
            Assert.equal(response.data.lastResult, '(failed)')
          })
  
          it('should be equal to the error', function () {
            Assert.deepEqual(response.data.lastError, {
              'message': error.message,
              'stack': error.stack
            })
          })
  
        })
  
      })
  
      after(function() {
        return server.onUnscheduled()
      })
      
    })
  
    describe('onFinished()', function () {

      before(async function() {
        await server.onScheduled()
        await server.onFinished(Duration.fromObject({ 'minutes': 10 }))
      })

      describe('/api/status', function () {

        describe('GET', function () {

          let response = null
  
          before(async function () {
            response = await request.get('/api/status')
          })
  
          it('should be valid', function () {
            Assert.jsonSchema(response.data, STATUS_SCHEMA)
          })
  
          it('should be equal to \'(not started)\'', function () {
            Assert.equal(response.data.currentStamp, '(not started)')
          })
  
        })
  
      })
  
      after(function() {
        return server.onUnscheduled()
      })
      
    })

    describe('onUnscheduled()', function () {
  
      before(async function() {
        await server.onScheduled()
        await server.onUnscheduled()
      })

      describe('/api/status', function () {

        describe('HEAD', function () {
  
          it('should fail', async function () {

            try {
              await request.head('/api/status')
              throw new RequestSucceededError('/api/status')
            }
            catch (error) {
              if (error instanceof RequestSucceededError) {
                throw error
              }
            }

          })
  
        })
  
      })
      
    })
  
    after(function () {
      Configuration.clear()
      Configuration.merge(Configuration.test)
    })

  })

})
