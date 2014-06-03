/*
 * grunt-zaproxy
 * https://github.com/TeamPraxis/grunt-zaproxy
 *
 * Copyright (c) 2014 Keith Hamasaki
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint']);

};
