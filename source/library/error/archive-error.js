import { Path } from '@virtualpatterns/mablung'

import Is from '../utility/is'

function ArchiveError(message) {

  Error.call(this)
  Error.captureStackTrace(this, ArchiveError)

  this.message = message

}

ArchiveError.prototype = Object.create(Error.prototype)
ArchiveError.prototype.constructor = ArchiveError
ArchiveError.prototype.name = ArchiveError.name

function ArchiveClassNotFoundError(option) {

  Error.call(this)
  Error.captureStackTrace(this, ArchiveClassNotFoundError)

  this.message = `Unable to find an archive class for the target path '${Path.trim(option.path.target)}'.`

}

ArchiveClassNotFoundError.prototype = Object.create(ArchiveError.prototype)
ArchiveClassNotFoundError.prototype.constructor = ArchiveClassNotFoundError
ArchiveClassNotFoundError.prototype.name = ArchiveClassNotFoundError.name

function ArchiveArchiveError(value) {

  Error.call(this)
  Error.captureStackTrace(this, ArchiveArchiveError)

  if (Is.error(value)) {
    this.message = `Unable to archive one or more source paths (${value.message})`
  }
  else if (Is.string(value)) {
    this.message = `Unable to archive one or more source paths\n\n${value}`
  }
  else {
    this.message = 'Unable to archive one or more source paths'
  }

}

ArchiveArchiveError.prototype = Object.create(ArchiveError.prototype)
ArchiveArchiveError.prototype.constructor = ArchiveArchiveError
ArchiveArchiveError.prototype.name = ArchiveArchiveError.name

export { ArchiveError, ArchiveClassNotFoundError, ArchiveArchiveError }
