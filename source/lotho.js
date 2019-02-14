#!/usr/bin/env node

import '@babel/polyfill'
import { Process } from '@virtualpatterns/mablung'
import Source from 'source-map-support'

import Command from './library/command'
import Is from './library/utility/is'

import Local from './library/archive/local'
import Remote from './library/archive/remote'

Source.install({ 'handleUncaughtExceptions': false })

Local.registerArchiveClass()
Remote.registerArchiveClass()

Command.parse(Process.argv)

let [ , , ...parameter ] = Process.argv
if (Is.emptyArray(parameter)) Command.outputHelp()
