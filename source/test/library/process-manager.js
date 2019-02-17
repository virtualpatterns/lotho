import { assert as Assert } from 'chai'
import { FileSystem, Path, Process } from '@virtualpatterns/mablung'
import Sanitize from 'sanitize-filename'

import ProcessManager from '../../library/process-manager'
import Configuration from '../../configuration'

describe('process-manager', function () {

  describe('startArchive()', function () {

    let processManager = null
    let pid = null 

    before(async function () {

      let rootPath = 'resource/test/library/process-manager/startArchive'
      let configurationPath = `${rootPath}/configuration.json`
  
      Configuration.merge(configurationPath)

      processManager = await ProcessManager.openProcessManager(Configuration.archive[0])
      pid = (await processManager.startArchive()).pid
      
    })
  
    it('should be a valid pid', function () {
      Process.kill(pid, 0)
    })

    it('should create the content directory', function () {
      return FileSystem.whenFileExists(1000, 20000, `${Configuration.archive[0].path.target}/${Configuration.name.content}`)
    })

    after(async function () {

      await processManager.stopArchive()
      await processManager.close()

      await Promise.all([
        FileSystem.remove(`${Configuration.archive[0].path.target}/${Configuration.name.content}`),
        FileSystem.remove(`${Configuration.path.home}/${Sanitize(Configuration.archive[0].name)}.log`)
      ])

      Configuration.clear()
      Configuration.merge(Configuration.test)

    })

  })

  describe('stopArchive()', function () {

    let processManager = null
    let pid = null 

    before(async function () {
      
      let rootPath = Path.normalize(`${__dirname}/../../../resource/test/library/process-manager/stopArchive`)
      let configurationPath = `${rootPath}/configuration.json`
  
      Configuration.merge(configurationPath)

      processManager = await ProcessManager.openProcessManager(Configuration.archive[0])
      pid = (await processManager.startArchive()).pid
      
      await FileSystem.whenFileExists(1000, 20000, `${Configuration.archive[0].path.target}/${Configuration.name.content}`)

      await processManager.stopArchive()

    })
  
    it('should not be a valid pid', function () {
      Assert.throws(() => Process.kill(pid, 0))
    })

    after(async function () {

      await processManager.close()

      await Promise.all([
        FileSystem.remove(`${Configuration.archive[0].path.target}/${Configuration.name.content}`),
        FileSystem.remove(`${Configuration.path.home}/${Sanitize(Configuration.archive[0].name)}.log`)
      ])

      Configuration.clear()
      Configuration.merge(Configuration.test)

    })

  })

})
