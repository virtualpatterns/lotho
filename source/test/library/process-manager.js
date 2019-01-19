import { assert as Assert } from 'chai'
import { FileSystem, Path, Process } from '@virtualpatterns/mablung'

import ProcessManager from '../../library/process-manager'
import Configuration from '../../configuration'

describe('process-manager', () => {

  describe('startArchive()', () => {

    let pid = null 

    before(async () => {
      Configuration.merge(Path.normalize(`${__dirname}/../../../resource/test/library/process-manager/startArchive/configuration.json`))
      pid = (await ProcessManager.startArchive()).pid
    })
  
    it('should be a valid pid', () => {
      Process.kill(pid, 0)
    })

    it('should create the content directory', () => {
      return FileSystem.whenFileExists(1000, 20000, `${Configuration.path.target}/content`)
    })

    after(async () => {
      await ProcessManager.stopArchive()
      await FileSystem.remove(`${Configuration.path.target}/content`)
      Configuration.clear()
    })

  })

  describe('stopArchive()', () => {

    let pid = null 

    before(async () => {

      Configuration.merge(Path.normalize(`${__dirname}/../../../resource/test/library/process-manager/startArchive/configuration.json`))

      pid = (await ProcessManager.startArchive()).pid
      await ProcessManager.stopArchive()

    })
  
    it('should not be a valid pid', () => {
      Assert.throws(() => Process.kill(pid, 0))
    })

    after(async () => {
      await FileSystem.remove(`${Configuration.path.target}/content`)
      Configuration.clear()
    })

  })

})
