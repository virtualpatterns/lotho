import { assert as Assert } from 'chai'

import Is from '../../../library/utility/is'

describe('is', function () {

  describe('emptyArray(value)', function () {
  
    it('should be true', function () {
      Assert.isTrue(Is.emptyArray([]))
    })
  
    it('should be false', function () {
      Assert.isFalse(Is.emptyArray([ 0 ]))
    })

  })

})
