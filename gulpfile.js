const gulp = require('gulp');
const ts = require('gulp-typescript');


gulp.task('build-ts', () => {
    return gulp.src('src/**/*.ts')
        .pipe(ts({
            "target": "es5",
            "module": "commonjs",
            "removeComments": false,
            "noImplicitAny": false,
            "sourceMap": false,
            "declaration": true,
        }))
        .pipe(gulp.dest('lib'));
});
