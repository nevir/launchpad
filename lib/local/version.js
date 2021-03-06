var exec = require('child_process').exec;
var Q = require('q');
var path = require('path');
var plist = require('plist');
var utils = require('./utils');

module.exports = function(browser) {
  if (!browser || !browser.path) {
    return Q.resolve(null);
  }

  // Run ShowVer.exe and parse out ProductVersion key (Windows)
  if (process.platform === 'win32') {
    var command = path.join(__dirname, '..', '..', 'resources', 'ShowVer.exe "' + browser.command + '"');
    var deferred = Q.defer();

    // Can't use Q.nfcall here unfortunately because of non 0 exit code
    exec(command, function(error, stdout) {
      var regex = /ProductVersion:\s*(.*)/;
      // ShowVer.exe returns a non zero status code even if it works
      if (typeof stdout === 'string' && regex.test(stdout)) {
        browser.version = stdout.match(regex)[1];
        return deferred.resolve(browser);
      }

      deferred.reject(error);
    });

    return deferred.promise;
  }

  // Read from plist information (MacOS)
  if(browser.plistPath) {
    var plistInfo = path.join(browser.path, browser.plistPath);
    try {
      var data = plist.parseFileSync(plistInfo);
      browser.version = data[browser.versionKey];
      return Q.resolve(browser);
    } catch (e) {
      return Q.reject(new Error('Unable to get ' + browser.name + ' version.'));
    }
  }

  // Try executing <browser> --version (everything else)
  return Q.nfcall(exec, browser.path + ' --version').then(function(stdout) {
    var version = utils.getStdout(stdout);
    if (version) {
      browser.version = version;
    }
    return browser;
  }, function() {
    return browser;
  });
}
