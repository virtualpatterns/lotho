import { assert as Assert } from 'chai'
import { Path } from '@virtualpatterns/mablung'

import Configuration from '../configuration'

describe('configuration', function () {

  let rootPath = Path.normalize(`${__dirname}/../../resource/test/configuration`)
  let configurationPath = `${rootPath}/configuration.json`

  describe('merge(value)', function () {

    before(function () {
      Configuration.merge(configurationPath)
    })

    it(`should be equal to '${Path.trim(configurationPath)}'`, function () {
      Assert.equal(Configuration.path.configuration, configurationPath)
    })

    after(function () {
      Configuration.clear()
      Configuration.merge(Configuration.test)
    })

  })

  describe('clear()', function () {

    before(async function () {
      Configuration.merge(configurationPath)
      Configuration.clear()
      Configuration.merge(Configuration.test)
    })

    it(`should not be equal to '${Path.trim(configurationPath)}'`, function () {
      Assert.notEqual(Configuration.path.configuration, configurationPath)
    })

  })

})
