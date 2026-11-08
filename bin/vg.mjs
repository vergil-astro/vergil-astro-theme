#!/usr/bin/env node
// The site-local vg: the vergil-cli installed along with the framework package, so commands match the framework version one to one.
// A globally installed vg run inside a site directory also hands off to this one.
await import('@vergil-astro/vergil-cli');
