/*
 * grunt-zaproxy
 * https://github.com/TeamPraxis/grunt-zaproxy
 *
 * Copyright (c) 2014 Keith Hamasaki
 * Licensed under the MIT license.
 */
'use strict';

var async = require('async'),
    path = require('path'),
    ZapClient = require('zaproxy'),
    spawn = require('child_process').spawn,
    _ = require('lodash');

module.exports = function (grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  /**
   * Start ZAProxy and wait for it to finish initializing.
   **/
  grunt.registerTask('zap_start', 'Start ZAProxy.', function () {
    // Set up command line options.
    var options = this.options({
      host: 'localhost',
      port: '8080',
      daemon: true
    });

    var args = [];
    if (options.daemon) {
      args.push('-daemon');
    }
    if (options.config) {
      for (var k in options.config) {
        args.push('-config');
        args.push(k + '=' + options.config[k]);
      }
    }
    if (options.host) {
      args.push('-host');
      args.push(options.host);
    }
    if (options.port) {
      args.push('-port');
      args.push(options.port);
    }

    // Spawn ZAProxy
    // var zapPath = path.join(__dirname, '../vendor/zap');
    // var cmd = path.join(options.path, 'zap.sh');
    grunt.log.write('Starting ZAProxy: ');
    var child = spawn('zap.sh', args);
    child.on('close', function (code) {
      if (code) {
        grunt.fail.warn('Error launching ZAProxy: ' + code);
      }
    });
    child.on('error', function (err) {
      if (err.code === 'ENOENT') {
        grunt.fail.fatal('Error launching ZAProxy. Make sure that ZAProxy is installed and zap.sh is available on the executable path.');
      }
    });

    // Wait until the proxy is responding
    var done = this.async();
    var retryCount = 0;
    var zaproxy = new ZapClient({ proxy: 'http://' + options.host + ':' + options.port });
    var wait = function (callback) {
      zaproxy.core.version(function (err) {
        if (err) {
          grunt.log.write('.');
          retryCount += 1;
          if (retryCount > 30) {
            grunt.log.writeln('ZAProxy is taking too long, killing.');
            child.kill('SIGKILL');
            done();
          } else {
            setTimeout(function () {
              wait(callback);
            }, 1000);
          }
        } else {
          zaproxy.core.newSession('', false, function () {
            grunt.log.ok();
            done();
          });
        }
      });
    };
    wait();
  });

  /**
   * Stop a running ZAProxy.
   **/
  grunt.registerTask('zap_stop', 'Stop ZAProxy.', function () {
    // Set up options.
    var options = this.options({
      host: 'localhost',
      port: '8080',
      apiKey: '7c3sdphhcg24l7hnjj0dgeg3as'
    });

    var asyncDone = this.async();

    // fail the build if zap_alert found errors
    var done = function () {
      if (grunt.config.get('zap_alert.failed')) {
        asyncDone(false);
      } else {
        asyncDone(true);
      }
    };

    console.log('SERVER_HOST : ' + options.host);
    console.log('SERVER_PORT : ' + options.port);
    console.log('APIKEY : ' + options.apiKey);

    var options = { proxy: 'http://' + options.host + ':' + options.port, apikey: options.apiKey };

    var zaproxy = new ZapClient(options);
    grunt.log.write('Stopping ZAProxy: ');
    zaproxy.core.shutdown(function (err) {
      if (err) {
        grunt.fail.warn('ZAProxy does not appear to be running: ' + JSON.stringify(err, null, 2));
        done();
        return;
      }

      var retryCount = 0;
      var wait = function (callback) {
        zaproxy.core.version(function (err) {
          if (err) {
            grunt.log.ok();
            done();
          } else {
            grunt.log.write('.');
            retryCount += 1;
            if (retryCount > 30) {
              grunt.log.writeln('ZAProxy is taking too long, exiting.');
              done();
            } else {
              setTimeout(function () {
                wait(callback);
              }, 1000);
            }
          }
        });
      };
      wait();
    });
  });

  /**
   * Wait for a scan to finish.
   **/
  var waitForScan = function (zaproxy, statusFn, callback) {
    var wait = function () {
      statusFn(function (err, body) {
        if (err) {
          callback(err);
          return;
        }
        if (body.status < 100) {
          grunt.log.write('.');
          setTimeout(function () {
            wait(callback);
          }, 1000);
        } else {
          callback(null, body);
        }
      });
    };
    wait();
  };

  /**
   * Wait for passive scanning to finish.
   **/
  var waitForPassive = function (zaproxy, callback) {
    var wait = function () {
      zaproxy.pscan.recordsToScan(function (err, body) {
        if (err) {
          callback(err);
          return;
        }
        if (body.recordsToScan > 0) {
          grunt.log.write('.');
          setTimeout(function () {
            wait(callback);
          }, 1000);
        } else {
          callback(null, body);
        }
      });
    };
    wait();
  };

  /**
   * Initiate a spider scan and wait for it to finish.
   **/
  grunt.registerMultiTask('zap_spider', 'Execute a ZAProxy spider.', function () {
    // Set up options.
    var options = this.options({
      host: 'localhost',
      port: '8080',
      exclude: []
    });

    // check for required options
    if (!options.url) {
      grunt.fail.warn('url must be defined.');
      return;
    }

    grunt.log.write('Spidering: ');
    var done = this.async();
    var zaproxy = new ZapClient({ proxy: 'http://' + options.host + ':' + options.port });
    _.bindAll(zaproxy.spider, _.functions(zaproxy.spider));

    async.series([
      async.apply(async.eachSeries, options.exclude, zaproxy.spider.excludeFromScan),
      async.apply(zaproxy.spider.scan, options.url),
      async.apply(waitForScan, zaproxy, zaproxy.spider.status)
    ], function (err) {
      if (err) {
        grunt.fail.warn('Spider Error: ' + JSON.stringify(err, null, 2));
        done();
        return;
      }

      grunt.log.ok();
      done();
    });
  });

  /**
   * Initiate an active scan and wait for it to finish.
   **/
  grunt.registerMultiTask('zap_scan', 'Execute a ZAProxy scan.', function () {
    // Set up options.
    var options = this.options({
      host: 'localhost',
      port: '8080',
      exclude: [],
      disable: []
    });

    // check for required options
    if (!options.url) {
      grunt.fail.warn('url must be defined.');
      return;
    }

    grunt.log.write('Scanning: ');
    var done = this.async();
    var zaproxy = new ZapClient({ proxy: 'http://' + options.host + ':' + options.port });
    _.bindAll(zaproxy.ascan, _.functions(zaproxy.ascan));

    async.series([
      async.apply(async.eachSeries, options.exclude, zaproxy.ascan.excludeFromScan),
      async.apply(zaproxy.ascan.enableAllScanners),
      function (callback) {
        if (options.disable && options.disable.length) {
          zaproxy.ascan.disableScanners(options.disable.join(','), callback);
        } else {
          callback();
        }
      },
      async.apply(zaproxy.ascan.scan, options.url, '', ''),
      async.apply(waitForScan, zaproxy, zaproxy.ascan.status)
    ], function (err) {
      if (err) {
        grunt.fail.warn('Scan Error: ' + JSON.stringify(err, null, 2));
        done();
        return;
      }

      grunt.log.ok();
      done();
    });
  });

  /**
   * Check alerts from a running ZAProxy.
   **/
  grunt.registerTask('zap_alert', 'Check alerts from ZAProxy.', function () {
    // Set up options.
    var options = this.options({
      host: 'localhost',
      port: '8080',
      ignore: []
    });

    var done = this.async();
    var zaproxy = new ZapClient({ proxy: 'http://' + options.host + ':' + options.port });

    grunt.log.write('Waiting for scanning to finish: ');
    waitForPassive(zaproxy, function (err) {
      if (err) {
        grunt.fail.warn('ZAProxy does not appear to be running.');
        done();
        return;
      }

      grunt.log.ok();
      grunt.log.write('Checking for alerts: ');
      zaproxy.core.alerts('', '', '', function (err, res) {
        if (err) {
          grunt.fail.warn('ZAProxy does not appear to be running.');
          done();
          return;
        }

        var alerts = _.chain(res.alerts)
              .filter(function (alert) {
                return !_.contains(options.ignore, alert.alert);
              })
              .value();

        if (alerts.length > 0) {
          grunt.log.error('Alerts found: ' + JSON.stringify(alerts, null, 2));

          // set a flag so that the cleanup task can fail the build
          grunt.config.set('zap_alert.failed', true);
        } else {
          grunt.config.set('zap_alert.failed', false);
          grunt.log.ok();
        }
        done();
      });
    });
  });

  /**
   * Retrieve the XML report from a running ZAProxy.
   **/
  grunt.registerTask('zap_report', 'Retrieve the ZAProxy XML report.', function () {
    // Set up options.
    var options = this.options({
      host: 'localhost',
      port: '8080',
      html: false
    });

    // check for required options
    if (!options.dir) {
      grunt.fail.warn('dir must be defined.');
      return;
    }

    var done = this.async();
    var zaproxy = new ZapClient({ proxy: 'http://' + options.host + ':' + options.port });

    grunt.log.write('Retrieving XML report: ');
    zaproxy.core.xmlreport(function (err, data) {
      grunt.log.ok();

      var filename = path.join(options.dir, 'report.xml');
      grunt.log.write('Writing ' + filename + ': ');
      grunt.file.write(filename, data);
      grunt.log.ok();

      if (options.html) {
        var xslt;
        try {
          xslt = require('node_xslt');
        } catch (e) {
          grunt.log.error('Unable to generate HTML report because node_xslt is not installed. Make sure that you have the required dependencies for node_xslt.');
          done(false);
          return;
        }

        var htmlFilename = path.join(options.dir, 'report.html');
        grunt.log.write('Writing ' + htmlFilename + ': ');
        var stylesheet = xslt.readXsltFile(path.join(__dirname, '../report.html.xsl'));
        var document = xslt.readXmlString(data);
        grunt.file.write(htmlFilename, xslt.transform(stylesheet, document, []));
        grunt.log.ok();
        done();
      } else {
        done();
      }
    });
  });
};
