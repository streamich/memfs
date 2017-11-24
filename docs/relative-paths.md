# Relative paths

If you work with *absolute* paths, you should get what you expect from `memfs`.

You can also use *relative* paths but the gotcha is that then `memfs` needs
to somehow resolve those relative paths into absolute paths. `memfs` will use
the value of `process.cwd()` to resolve the relative paths. The problem is
that `process.cwd()` specifies the *current working directory* of your
on-disk filesystem and you will probably not have that directory available in your
`memfs` volume.

The best solution is to always use absolute paths. Alternatively, you can use
`mkdirp` method to recursively create the current working directory in your
volume:

```js
vol.mkdirpSync(process.cwd());
```

Or, you can set the current working directory to `/`, which
is one folder that exists in all your `memfs` volumes:

```js
process.chdir('/');
```
