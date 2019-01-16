import { assert as Assert } from 'chai'
import ChildProcess from 'child_process'
import { FileSystem, Path, Process } from '@virtualpatterns/mablung'

import Configuration from '../configuration'

describe('lotho', () => {

  describe('create-configuration', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/create-configuration`)
    let configurationPath = `${rootPath}/configuration.json`

    let code = null

    before(() => {

      return new Promise((resolve) => {

        let parameter = [
          ...Object.keys(Configuration.test.parameter.lotho).filter((name) => Configuration.test.parameter.lotho[name]),
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'create-configuration'
        ]
  
        let option = { 'stdio': 'inherit' }
        let process = ChildProcess.fork(Configuration.test.path.lotho, parameter, option)
  
        process.on('exit', (_code) => {
          code = _code  
          resolve()
        })
  
      })

    })

    it('should exit with 0', () => {
      Assert.equal(code, 0)
    })

    it('should create the configuration file', async () => {
      Assert.isTrue(await FileSystem.pathExists(configurationPath))
    })
    
    after(() => {
      return FileSystem.remove(configurationPath)
    })

  })

  describe('run-once', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/run-once`)
    let configurationPath = `${rootPath}/configuration.json`
    let targetPath = `${rootPath}/target`

    let code = null

    before(() => {

      return new Promise((resolve) => {

        let parameter = [
          ...Object.keys(Configuration.test.parameter.lotho).filter((name) => Configuration.test.parameter.lotho[name]),
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'run-once'
        ]
  
        let option = { 'stdio': 'inherit' }
        let process = ChildProcess.fork(Configuration.test.path.lotho, parameter, option)
  
        process.on('exit', (_code) => {
          code = _code  
          resolve()
        })
  
      })

    })

    it('should exit with 0', () => {
      Assert.equal(code, 0)
    })

    it('should create the content directory', async () => {
      Assert.isTrue(await FileSystem.pathExists(`${targetPath}/content`))
    })
    
    after(() => {
      return FileSystem.remove(`${targetPath}/content`)
    })

  })
   
  describe('run-schedule', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/run-schedule`)
    let configurationPath = `${rootPath}/configuration.json`
    let targetPath = `${rootPath}/target`

    let process = null

    before(() => {

      let parameter = [
        ...Object.keys(Configuration.test.parameter.lotho).filter((name) => Configuration.test.parameter.lotho[name]),
        '--configurationPath', configurationPath,
        '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
        'run-schedule'
      ]

      let option = { 'stdio': 'inherit' }
      
      process = ChildProcess.fork(Configuration.test.path.lotho, parameter, option)

    })

    it('should create the content directory', () => {
      return FileSystem.whenFileExists(1000, 20000, `${targetPath}/content`)
    })
    
    after(() => {

      return Promise.resolve()
        .then(() => new Promise((resolve) => {

          process.on('exit', () => {
            resolve()
          })
  
          process.kill()
    
        }))
        .then(() => FileSystem.remove(`${targetPath}/content`))

    })

  })
   
  describe('start-archive', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/start-archive`)
    let configurationPath = `${rootPath}/configuration.json`
    let targetPath = `${rootPath}/target`

    let code = null

    before(() => {

      return new Promise((resolve) => {

        let parameter = [
          ...Object.keys(Configuration.test.parameter.lotho).filter((name) => Configuration.test.parameter.lotho[name]),
          '--configurationPath', configurationPath,
          '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
          'start-archive'
        ]
  
        let option = { 'stdio': 'inherit' }
        let process = ChildProcess.fork(Configuration.test.path.lotho, parameter, option)
  
        process.on('exit', (_code) => {
          code = _code  
          resolve()
        })
  
      })

    })

    it('should exit with 0', () => {
      Assert.equal(code, 0)
    })

    it('should create the process manager pid file', async () => {
      Assert.isTrue(await FileSystem.pathExists(`${Process.env.HOME}/.pm2/pm2.pid`))
    })
    
    it('should create the content directory', () => {
      return FileSystem.whenFileExists(1000, 20000, `${targetPath}/content`)
    })
    
    after(() => {

      return Promise.resolve()
        .then(() => new Promise((resolve) => {

          let parameter = [
            ...Object.keys(Configuration.test.parameter.lotho).filter((name) => Configuration.test.parameter.lotho[name]),
            '--configurationPath', configurationPath,
            '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
            'stop-archive'
          ]
    
          let option = { 'stdio': 'inherit' }
          let process = ChildProcess.fork(Configuration.test.path.lotho, parameter, option)
    
          process.on('exit', () => {
            resolve()
          })
    
        }))
        .then(() => FileSystem.remove(`${targetPath}/content`))

    })

  })
   
  describe('stop-archive', () => {

    let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/stop-archive`)
    let configurationPath = `${rootPath}/configuration.json`
    let targetPath = `${rootPath}/target`

    let code = null

    before(() => {

      return Promise.resolve()
        .then(() => new Promise((resolve) => {

          let parameter = [
            ...Object.keys(Configuration.test.parameter.lotho).filter((name) => Configuration.test.parameter.lotho[name]),
            '--configurationPath', configurationPath,
            '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
            'start-archive'
          ]
    
          let option = { 'stdio': 'inherit' }
          let process = ChildProcess.fork(Configuration.test.path.lotho, parameter, option)
    
          process.on('exit', () => {
            resolve()
          })
    
        }))
        .then(() => FileSystem.whenFileExists(1000, 20000, `${targetPath}/content`))
        .then(() => new Promise((resolve) => {

          let parameter = [
            ...Object.keys(Configuration.test.parameter.lotho).filter((name) => Configuration.test.parameter.lotho[name]),
            '--configurationPath', configurationPath,
            '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
            'stop-archive'
          ]
    
          let option = { 'stdio': 'inherit' }
          let process = ChildProcess.fork(Configuration.test.path.lotho, parameter, option)
    
          process.on('exit', (_code) => {
            code = _code
            resolve()
          })
    
        }))

    })

    it('should exit with 0', () => {
      Assert.equal(code, 0)
    })

    after(() => {
      return FileSystem.remove(`${targetPath}/content`)
    })

  })
   
  // describe.only('kill-process-manager', () => {

  //   let rootPath = Path.normalize(`${__dirname}/../../resource/test/lotho/kill-process-manager`)
  //   let configurationPath = `${rootPath}/configuration.json`
  //   let targetPath = `${rootPath}/target`

  //   let code = null

  //   before(() => {

  //     return Promise.resolve()
  //     // .then(() => new Promise((resolve) => {

  //     //   let parameter = [
  //     //     ...Object.keys(Configuration.test.parameter.lotho).filter((name) => Configuration.test.parameter.lotho[name]),
  //     //     '--configurationPath', configurationPath,
  //     //     '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
  //     //     'start-archive'
  //     //   ]
  
  //     //   let option = { 'stdio': 'inherit' }
  //     //   let process = ChildProcess.fork(Configuration.test.path.lotho, parameter, option)
  
  //     //   process.on('exit', () => {
  //     //     resolve()
  //     //   })
  
  //     // }))
  //     // .then(() => FileSystem.whenFileExists(1000, 20000, `${targetPath}/content`))
  //       .then(() => new Promise((resolve) => {

  //         let parameter = [
  //           ...Object.keys(Configuration.test.parameter.lotho).filter((name) => Configuration.test.parameter.lotho[name]),
  //           '--configurationPath', configurationPath,
  //           '--logLevel', Configuration.test.logLevel, '--logPath', Configuration.test.logPath,
  //           'kill-process-manager'
  //         ]
    
  //         let option = { 'stdio': 'inherit' }
  //         let process = ChildProcess.fork(Configuration.test.path.lotho, parameter, option)
    
  //         process.on('exit', (_code) => {
  //           code = _code
  //           resolve()
  //         })
    
  //       }))

  //   })

  //   it('should exit with 0', () => {
  //     Assert.equal(code, 0)
  //   })

  //   it('should delete the process manager pid file', async () => {
  //     Assert.isFalse(await FileSystem.pathExists(`${Process.env.HOME}/.pm2/pm2.pid`))
  //   })
    
  //   after(() => {
  //     return FileSystem.remove(`${targetPath}/content`)
  //   })

  // })

})

require('./library/index')
