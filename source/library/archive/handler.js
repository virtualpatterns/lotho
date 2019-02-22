import { Log } from '@virtualpatterns/mablung'

const handlerPrototype = Object.create({})

handlerPrototype.onScheduled = function () {}
handlerPrototype.onStarted = function () {}
handlerPrototype.onSucceeded = function () {}
handlerPrototype.onFailed = function () {}
handlerPrototype.onFinished = function () {}
handlerPrototype.onUnscheduled = function () {}

handlerPrototype.onError = async function (error) {
  Log.error(error, 'Handler.onError(error)')
}

const Handler = Object.create({})

Handler.createHandler = function (archive, prototype = handlerPrototype) {

  let handler = Object.create(prototype)

  handler.archive = archive

  handler.archive.on('scheduled', handler.onScheduled.bind(handler))
  handler.archive.on('started', handler.onStarted.bind(handler))
  handler.archive.on('succeeded', handler.onSucceeded.bind(handler))
  handler.archive.on('failed', handler.onFailed.bind(handler))
  handler.archive.on('finished', handler.onFinished.bind(handler))
  handler.archive.on('unscheduled', handler.onUnscheduled.bind(handler))

  handler.archive.on('error', handler.onError.bind(handler))

  return handler

}

Handler.getHandlerPrototype = function () {
  return handlerPrototype
}

Handler.isHandler = function (handler) {
  return handlerPrototype.isPrototypeOf(handler)
}

export default Handler
