import { assert as Assert } from 'chai'
import { Path } from '@virtualpatterns/mablung'

import Configuration from '../configuration'

describe('configuration', () => {

  let rootPath = Path.normalize(`${__dirname}/../../resource/test/configuration`)
  let configurationPath = `${rootPath}/configuration.json`

  describe('merge(value)', () => {

    before(() => {
      Configuration.merge(configurationPath)
    })

    it(`should be equal to '${Path.trim(configurationPath)}'`, () => {
      Assert.equal(Configuration.path.configuration, configurationPath)
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

    it(`should not be equal to '${Path.trim(configurationPath)}'`, () => {
      Assert.notEqual(Configuration.path.configuration, configurationPath)
    })

  })

})
