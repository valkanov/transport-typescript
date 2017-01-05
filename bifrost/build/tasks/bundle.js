/*
 * Copyright (c) 2016 VMware, Inc. All Rights Reserved.
 * This software is released under MIT license.
 * The full license information can be found in LICENSE in the root directory of this project.
 */

var gulp = require("gulp");
var Builder = require("systemjs-builder");
var zip = require('gulp-zip');

/**
 * Bundles the compiled js files into bifrost.min.js
 */
gulp.task("bundle:bifrost:js", ["typescript:bifrost"], function() {
    var buildOpts = { minify: true, mangle: false, normalize: true };

    var builder = new Builder("dist/");
    builder.config({
        meta: {
            "@angular/*"    : { build: false },
            "rxjs*"          : { build: false }
        },
        packages: {
            'bifrost': { main: 'index.js', defaultExtension: 'js' }
        }
    });

    return builder.bundle("bifrost/**/*.js", "dist/bundles/bifrost.min.js", buildOpts)
        .catch(function(err) {
            console.error(err);
            process.exit(1);
        });
});

/**
 * Specific ng1-compatible bundle for Angular 1 applications. Do not publicize.
 */
gulp.task("bundle:bifrost:js:ng1", ["typescript:bifrost"], function() {
    var buildOpts = { minify: true, mangle: false, runtime: false };

    var packages = {
        'tmp/bifrost':  { defaultExtension: 'js' },
        'rxjs':                 { defaultExtension: 'js' }
    };

    var builder = new Builder();
    builder.config({
        // We bundle both Angular and RxJS with us.
        map: {
            'rxjs':                                 'node_modules/rxjs',
            '@angular/core':                        'node_modules/@angular/core/bundles/core.umd.js',
            '@angular/common':                      'node_modules/@angular/common/bundles/common.umd.js',
            '@angular/compiler':                    'node_modules/@angular/compiler/bundles/compiler.umd.js',
            '@angular/platform-browser':            'node_modules/@angular/platform-browser/bundles/platform-browser.umd.js',
            '@angular/platform-browser-dynamic':    'node_modules/@angular/platform-browser-dynamic/bundles/platform-browser-dynamic.umd.js',
            '@angular/router':                      'node_modules/@angular/router/bundles/router.umd.js',
            '@angular/forms':                       'node_modules/@angular/forms/bundles/forms.umd.js'
        },
        packages: packages
    });

    return builder.buildStatic("tmp/bifrost/**/*.js", "dist/bundles/angular1/bifrost1.min.js", buildOpts)
        .catch(function(err) {
            console.error(err);
            process.exit(1);
        });
});

/**
 * Compresses our deliverables and definition files for third-party devs.
 */
gulp.task("bundle:zip", ["bundle:bifrost:js"], function() {
    return gulp.src([
        "dist/bundles/clarity-ui.min.css",
        "dist/bundles/bifrost.min.js",
        "tmp/definitions/**/*.d.ts"
    ])
        .pipe(zip('bifrost.dev.zip'))
        .pipe(gulp.dest("dist/bundles/"));
});

/**
 * Bundles all js files into a single minified one, then puts it in the bundles/ folder.
 * Also creates a zip with our css and js deliverables and our definition files
 * for third-party devs, then adds it to the bundles/ folder.
 */
gulp.task("bundle", ["bundle:bifrost:js", "bundle:zip"], function(){});

/**
 * Watches for changes in the transpiled js files to rebundle them
 */
gulp.task("bundle:watch", function () {

    var claritySources = [
        "src/bifrost/**/*.ts",
        "!src/bifrost/**/*.spec.ts",
        "!src/bifrost/**/*.mock.ts",
        "src/bifrost/**/*.html",
        "src/**/*.scss",
        "!src/**/*.clarity.scss"
    ];
    gulp.watch(claritySources, ["bundle:bifrost:js"]);
});
