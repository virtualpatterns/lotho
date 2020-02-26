import '@babel/polyfill'
import Jake from 'jake'
import { FileSystem, Log, Path } from '@virtualpatterns/mablung'

import Configuration from '../configuration'

Jake.addListener('start', () => {

  Configuration.merge(Configuration.task)

  if (Configuration.logPath == 'console') {
    Log.createFormattedLog({ 'level': Configuration.logLevel })
  }
  else {
    FileSystem.ensureDirSync(Path.dirname(Configuration.logPath))
    FileSystem.removeSync(Configuration.logPath)
    Log.createFormattedLog({ 'level': Configuration.logLevel }, Configuration.logPath)
  }

  Log.debug(Configuration.line)
  
})

desc('Remove built folders and files')
task('clean', [], { 'async': false }, () => {
  Jake.rmRf('distributable/library', { 'silent': true })
  Jake.rmRf('distributable/sandbox', { 'silent': true })
  Jake.rmRf('distributable/test', { 'silent': true })
  Jake.rmRf('distributable/lotho.js', { 'silent': true })
  Jake.rmRf('distributable/lotho.js.map', { 'silent': true })
})

desc('Count the number of dirty files')
task('count', [], { 'async': true }, () => {
  Jake.exec([ 'script/find-dirty-files' ], { 'printStderr': true, 'printStdout': true }, () => complete())
})

desc('Lint files')
task('lint', [], { 'async': true }, () => {
  Jake.exec([ 'eslint --ignore-path .gitignore --ignore-pattern source/configuration.js --ignore-pattern source/task source' ], { 'printStderr': true, 'printStdout': true }, () => complete())
})

desc('Build files')
task('build', [ 'clean', 'count', 'lint' ], { 'async': true }, () => {
  Jake.exec([
    ...[ 'library', 'sandbox', 'test' ].map((folderName) => `babel --config-file ./distributable/babel.configuration source/${folderName} --copy-files --out-dir distributable/${folderName} --source-maps`),
    ...[ 'lotho.js' ].map((fileName) => `babel --config-file ./distributable/babel.configuration source/${fileName} --out-file distributable/${fileName} --source-maps`),
    'chmod +x distributable/lotho.js',
    'npm --no-git-tag-version version prerelease'
  ], { 'printStderr': true, 'printStdout': false }, () => complete())
})

desc('Run tests')
task('test', [ 'build' ], { 'async': true }, () => {
  Jake.exec([ 'mocha --bail --timeout 0 distributable/test/lotho.js' ], { 'printStderr': true, 'printStdout': true }, () => complete())
})

desc('Publish package')
task('publish', [ 'test' ], { 'async': true }, () => {
  Jake.exec([
    'npm publish --access public',
    'git push',
    'npm --no-git-tag-version version patch',
    'git add package.json',
    'git commit --message="Increment version"'
  ], { 'printStderr': true, 'printStdout': true }, () => complete())
})
