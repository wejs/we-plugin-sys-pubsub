# we-plugin-sys-pubsub

We.js plugin to sync memory status between instances with pub and sub

## Installation

```sh
we i we-plugin-sys-pubsub
```

## API

```js
we.sysPubsub.subscribe('cached-main-menu-changes', function(data) {
  console.log('cached-main-menu-changes:data:', data);
  // data will be { menuId: 10 }
});

we.sysPubsub.publish('cached-main-menu-changes', {
  menuId: 10
});
```

## Links

> * We.js site: http://wejs.org

## Copyright and license

Copyright 2020+ Alberto Souza <contato@albertosouza.net> and contributors , under [the MIT license](https://github.com/wejs/we-core/blob/master/LICENSE.md).

