
# zhuge-node

A node.js client for [Zhuge](https://zhugeio.com) — The hassle-free way to integrate analytics into any application.

## Installation

```bash
$ npm install --save zhuge-node
```

## Quickstart

```js
const Analytics = require('zhuge-node');
const analytics = new Analytics({
  'appid': 'YOUR APPID',
  'secret': 'APP SECRET'
}, {
  // The number of messages to enqueue before flushing.
  flushAt: 20,
  // The number of milliseconds to wait before flushing the queue automatically.
  flushAfter: 10000
});

// identify user
analytics.identify({
  userId:'f4ca124298',
  traits: {
    name: 'Michael Bolton',
    email: 'mbolton@initech.com',
    createdAt: new Date('2014-06-14T02:00:19.467Z')
  }
});

// track action
// Note: before you define the event, you should register it before.
analytics.track({
  userId:'f4ca124298',
  event: 'Signed Up',
  properties: {
    plan: 'Enterprise'
  }
});

// page view
analytics.page({
  userId: '019mr8mf4r',
  category: 'Docs',
  name: 'Node.js Library',
  properties: {
    url: 'https://segment.com/docs/libraries/node',
    path: '/docs/libraries/node/',
    title: 'Node.js Library - Segment',
    referrer: 'https://github.com/segmentio/analytics-node'
  }
});
```

## License

  WWWWWW||WWWWWW
   W W W||W W W
        ||
      ( OO )__________
       /  |           \
      /o o|    MIT     \
      \___/||_||__||_|| *
           || ||  || ||
          _||_|| _||_||
         (__|__|(__|__|

Copyright &copy; 2015 WeFlex Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Thanks

This is a fork from Segment.io's [analytics-node](https://github.com/segmentio/analytics-node), so
very thanks for this upstream works.


