import { assert as Assert } from 'chai'

import Is from '../../library/is'

describe('is', function () {

  describe('emptyArray(value)', function () {
  
    it('should be true', function () {
      Assert.isTrue(Is.emptyArray([]))
    })

  })

})
