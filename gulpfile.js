var gulp = require('gulp');
var browserify = require('gulp-browserify');
var rename = require('gulp-rename');
// Basic usage 
gulp.task('build', function() {
	// Single entry point to browserify 
	gulp.src('index.js')
		.pipe(browserify({
		  insertGlobals : true,
		  debug : false
          
		}))
        .pipe(rename("wild-rtc.js"))
		.pipe(gulp.dest('./'))
});

var connect = require('gulp-connect');
 
gulp.task('serve',['build'], function() {
  connect.server({
    root: './',
    livereload: true
  });
});
