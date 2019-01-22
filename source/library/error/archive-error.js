
function ArchiveError(message) {

  Error.call(this)
  Error.captureStackTrace(this, ArchiveError)

  this.message = message

}

ArchiveError.prototype = Object.create(Error.prototype)
ArchiveError.prototype.constructor = ArchiveError
ArchiveError.prototype.name = ArchiveError.name

// function ArchiveLockError(path) {

//   Error.call(this)
//   Error.captureStackTrace(this, ArchiveLockError)

//   this.message = `Unable to lock/unlock the archive at ${Path.trim(path)}`

// }

// ArchiveLockError.prototype = Object.create(ArchiveError.prototype)
// ArchiveLockError.prototype.constructor = ArchiveLockError
// ArchiveLockError.prototype.name = ArchiveLockError.name

function ArchiveRunError() {

  Error.call(this)
  Error.captureStackTrace(this, ArchiveRunError)

  this.message = 'Unable to archive source directories'

}

ArchiveRunError.prototype = Object.create(ArchiveError.prototype)
ArchiveRunError.prototype.constructor = ArchiveRunError
ArchiveRunError.prototype.name = ArchiveRunError.name

export { ArchiveError, ArchiveRunError }
