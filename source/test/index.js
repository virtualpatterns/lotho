import '@babel/polyfill'
import { assert as Assert } from 'chai'
import ChildProcess from 'child_process'
import { FileSystem, Log, Path } from '@virtualpatterns/mablung'
import Source from 'source-map-support'

import Configuration from '../configuration'

Source.install({ 'handleUncaughtExceptions': false })

Log.createFormattedLog({ 'level': Configuration.test.logLevel }, Configuration.test.logPath)

require('./configuration')

describe('index', () => {

  let rootPath = Path.normalize(`${__dirname}/../../resource/test/index`)
  let configurationPath = `${rootPath}/configuration.json`
  let targetPath = `${rootPath}/target`

  before(() => {
    Configuration.merge(configurationPath)
  })

  ;[
    {
      'beforeFn': () => {},
      'parameter': [ 'runOnce' ],
      'exitCode': 0,
      'afterFn': () => {
        return FileSystem.remove(`${targetPath}/content`)
      }
    }
  ].forEach((test) => {

    describe(`(when passing '${test.parameter.join('\' \'')}')`, () => {

      before(() => {
        return test.beforeFn()
      })
    
      it(`should exit with ${test.exitCode}`, (complete) => {

        let parameter = [
          ...Object.keys(Configuration.test.parameter.index).filter((name) => Configuration.test.parameter.index[name]),
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          ...test.parameter
        ]

        let option = { 'stdio': 'inherit' }

        // Log.trace({ parameter, option }, `ChildProcess.fork('${Path.trim(Configuration.test.path.index)}', parameter, option)`)
        let process = ChildProcess.fork(Configuration.test.path.index, parameter, option)

        process.on('exit', (code) => {
          Assert.equal(code, test.exitCode)
          complete()
        })

      })
      
      after(() => {
        return test.afterFn()
      })
  
    })
     
  })

  describe('(when passing \'start\')', () => {

    let code = null

    before(() => {

      return new Promise((resolve) => {

        let parameter = [
          ...Object.keys(Configuration.test.parameter.index).filter((name) => Configuration.test.parameter.index[name]),
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'start'
        ]
  
        let option = { 'stdio': 'inherit' }
  
        // Log.trace({ parameter, option }, `ChildProcess.fork('${Path.trim(Configuration.test.path.index)}', parameter, option)`)
        let process = ChildProcess.fork(Configuration.test.path.index, parameter, option)
  
        process.on('exit', (_code) => {
          code = _code  
          resolve()
        })
  
      })

    })

    it('should exit with 0', () => {
      Assert.equal(code, 0)
    })

    it('should create the content directory', () => {
      return FileSystem.whenFileExists(1000, 15000, `${targetPath}/content`)
    })
    
    after(() => {

      return Promise.resolve()
        .then(() => new Promise((resolve) => {

          let parameter = [
            ...Object.keys(Configuration.test.parameter.index).filter((name) => Configuration.test.parameter.index[name]),
            '--configurationPath', configurationPath,
            '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
            'stop'
          ]
    
          let option = { 'stdio': 'inherit' }
    
          // Log.trace({ parameter, option }, `ChildProcess.fork('${Path.trim(Configuration.test.path.index)}', parameter, option)`)
          let process = ChildProcess.fork(Configuration.test.path.index, parameter, option)
    
          process.on('exit', () => {
            resolve()
          })
    
        }))
        .then(() => FileSystem.remove(`${targetPath}/content`))

    })

  })
   
  after(() => {
    Configuration.clear()
  })

})

require('./library/index')
