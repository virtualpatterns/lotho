import { Path } from '@virtualpatterns/mablung'

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

function ArchiveLockError(path) {

  Error.call(this)
  Error.captureStackTrace(this, ArchiveLockError)

  this.message = `Unable to lock/unlock the archive at ${Path.trim(path)}`

}

ArchiveLockError.prototype = Object.create(ArchiveError.prototype)
ArchiveLockError.prototype.constructor = ArchiveLockError
ArchiveLockError.prototype.name = ArchiveLockError.name

function ArchiveSynchronizeError() {

  Error.call(this)
  Error.captureStackTrace(this, ArchiveSynchronizeError)

  this.message = 'Unable to synchronize one or more source paths'

}

ArchiveSynchronizeError.prototype = Object.create(ArchiveError.prototype)
ArchiveSynchronizeError.prototype.constructor = ArchiveSynchronizeError
ArchiveSynchronizeError.prototype.name = ArchiveSynchronizeError.name

export { ArchiveError, ArchiveClassNotFoundError, ArchiveSynchronizeError }
