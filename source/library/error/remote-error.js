
import Is from '../utility/is'

function RemoteError(message) {

  Error.call(this)
  Error.captureStackTrace(this, RemoteError)

  this.message = message

}

RemoteError.prototype = Object.create(Error.prototype)
RemoteError.prototype.constructor = RemoteError
RemoteError.prototype.name = RemoteError.name

function RemoteCopyError(value) {

  Error.call(this)
  Error.captureStackTrace(this, RemoteCopyError)

  if (Is.error(value)) {
    this.message = `Unable to copy one or more paths (${value.message})`
  }
  else if (Is.string(value)) {
    this.message = `Unable to copy one or more paths\n\n${value}`
  }
  else {
    this.message = 'Unable to copy one or more paths'
  }

}

RemoteCopyError.prototype = Object.create(RemoteError.prototype)
RemoteCopyError.prototype.constructor = RemoteCopyError
RemoteCopyError.prototype.name = RemoteCopyError.name

export { RemoteError, RemoteCopyError }
