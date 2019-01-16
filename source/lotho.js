#!/usr/bin/env node

import '@babel/polyfill'
import { Process } from '@virtualpatterns/mablung'
import Source from 'source-map-support'

import Command from './library/command'

Source.install({ 'handleUncaughtExceptions': false })

Command
  .parse(Process.argv)

// // put pm2 in bin
// // startup
