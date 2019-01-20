import { Path } from '@virtualpatterns/mablung'

function TestError(message) {

  Error.call(this)
  Error.captureStackTrace(this, TestError)

  this.message = message

}

TestError.prototype = Object.create(Error.prototype)
TestError.prototype.constructor = TestError
TestError.prototype.name = TestError.name

function FileExistsError(path) {

  Error.call(this)
  Error.captureStackTrace(this, FileExistsError)

  this.message = `The file '${Path.trim(path)}' exists.`

}

FileExistsError.prototype = Object.create(TestError.prototype)
FileExistsError.prototype.constructor = FileExistsError
FileExistsError.prototype.name = FileExistsError.name

export { TestError, FileExistsError }
