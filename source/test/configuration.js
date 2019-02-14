import { assert as Assert } from 'chai'
import { Path } from '@virtualpatterns/mablung'

import Configuration from '../configuration'

describe('configuration', function () {

  let configurationPath = 'resource/test/configuration/configuration.json'

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

  describe('getParameter(...parameter)', function () {

    it('should have 0 items', function () {
      Assert.equal(Configuration.getParameter({}).length, 0)
    })

    it('should be [ \'a\' ]', function () {
      Assert.deepEqual(Configuration.getParameter({ 'a': true }), [ 'a' ])
    })

    it('should be [ \'a\' ]', function () {
      Assert.deepEqual(Configuration.getParameter({ 'a': true, 'b': false }), [ 'a' ])
    })

    it('should be [ \'a\', \'b\' ]', function () {
      Assert.deepEqual(Configuration.getParameter({ 'a': 'b' }), [ 'a', 'b' ])
    })

    it('should be [ \'a\', \'b\' ]', function () {
      Assert.deepEqual(Configuration.getParameter({ 'a': () => 'b' }), [ 'a', 'b' ])
    })

    it('should have 0 items', function () {
      Assert.equal(Configuration.getParameter({}, {}).length, 0)
    })

    it('should be [ \'a\' ]', function () {
      Assert.deepEqual(Configuration.getParameter({ 'a': true }, { 'b': false }), [ 'a' ])
    })

  })

})
