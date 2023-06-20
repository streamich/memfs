# Relative paths

If you work with _absolute_ paths, you should get what you expect from `memfs`.

You can also use _relative_ paths but the gotcha is that then `memfs` needs
to somehow resolve those relative paths into absolute paths. `memfs` will use
the value of `process.cwd()` to resolve the relative paths. The problem is
that `process.cwd()` specifies the _current working directory_ of your
on-disk filesystem and you will probably not have that directory available in your
`memfs` volume.

The best solution is to always use absolute paths. Alternatively, you can use
`mkdir` method to recursively create the current working directory in your
volume:

```js
vol.mkdirSync(process.cwd(), { recursive: true });
```

Or, you can set the current working directory to `/`, which
is one folder that exists in all `memfs` volumes:

```js
process.chdir('/');
```
