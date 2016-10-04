var gulp = require('gulp'),
    less = require('gulp-sass'),
    livereload = require('gulp-livereload');

gulp.task('sass', function() {
    gulp.src('sass/*.sass')
        .pipe(less())
        .pipe(gulp.dest('css'))
        .pipe(livereload());
});

gulp.task('watch', function() {
    livereload.listen();
    gulp.watch('sass/*.sass', ['sass']);
});