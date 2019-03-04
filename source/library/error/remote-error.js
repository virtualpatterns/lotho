import { Path } from '@virtualpatterns/mablung'

import Is from '../utility/is'

function RemoteError(message) {

  Error.call(this)
  Error.captureStackTrace(this, RemoteError)

  this.message = message

}

RemoteError.prototype = Object.create(Error.prototype)
RemoteError.prototype.constructor = RemoteError
RemoteError.prototype.name = RemoteError.name

function RemoteConnectError(value) {

  Error.call(this)
  Error.captureStackTrace(this, RemoteConnectError)

  if (Is.error(value)) {
    this.message = `Unable to connect to the remote server (${value.message})`
  }
  else if (Is.string(value)) {
    this.message = `Unable to connect to the remote server\n\n${value}`
  }
  else {
    this.message = 'Unable to connect to the remote server'
  }

}

RemoteConnectError.prototype = Object.create(RemoteError.prototype)
RemoteConnectError.prototype.constructor = RemoteConnectError
RemoteConnectError.prototype.name = RemoteConnectError.name

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

function RemoteDeleteError(path, value) {

  Error.call(this)
  Error.captureStackTrace(this, RemoteDeleteError)

  if (Is.error(value)) {
    this.message = `Unable to delete the path ${Path.trim(path)} (${value.message})`
  }
  else if (Is.string(value)) {
    this.message = `Unable to delete the path ${Path.trim(path)}\n\n${value}`
  }
  else {
    this.message = `Unable to delete the path ${Path.trim(path)}`
  }

}

RemoteDeleteError.prototype = Object.create(RemoteError.prototype)
RemoteDeleteError.prototype.constructor = RemoteDeleteError
RemoteDeleteError.prototype.name = RemoteDeleteError.name

export { RemoteError, RemoteConnectError, RemoteCopyError, RemoteDeleteError }
