
function CommandError(message) {

  Error.call(this)
  Error.captureStackTrace(this, CommandError)

  this.message = message

}

CommandError.prototype = Object.create(Error.prototype)
CommandError.prototype.constructor = CommandError
CommandError.prototype.name = CommandError.name

function CommandInvalidError(parameter) {

  Error.call(this)
  Error.captureStackTrace(this, CommandInvalidError)

  this.message = `The command '${parameter.join(' ')}' is invalid`

}

CommandInvalidError.prototype = Object.create(CommandError.prototype)
CommandInvalidError.prototype.constructor = CommandInvalidError
CommandInvalidError.prototype.name = CommandInvalidError.name

export { CommandError, CommandInvalidError }
