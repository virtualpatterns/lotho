import { assert as Assert } from 'chai'
import { Path } from '@virtualpatterns/mablung'

import Configuration from '../configuration'

describe('configuration', () => {

  let rootPath = Path.normalize(`${__dirname}/../../resource/test/configuration`)
  let configurationPath = `${rootPath}/configuration.json`
  let sourcePath = 'resource/test/configuration/source'

  describe('merge(value)', () => {

    before(() => {
      Configuration.merge(configurationPath)
    })

    it(`should include '${sourcePath}'`, () => {
      Assert.include(Configuration.path.source, sourcePath)
    })

    after(() => {
      Configuration.clear()
    })

  })

  describe('clear()', () => {

    before(() => {
      Configuration.merge(configurationPath)
      Configuration.clear()
    })

    it(`should not include '${sourcePath}'`, () => {
      Assert.notInclude(Configuration.path.source, sourcePath)
    })

  })

})
