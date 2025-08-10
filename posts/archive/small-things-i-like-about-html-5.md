---
title: HTML 5 is the future
description: HTML 5 is the future
date: 2011-06-14
layout: layouts/post.njk
tags: ["computers"]
---
Most people are talking about the big things that HTML 5 is bringing to the table, video, audio, Websockets APIs, etc. I thought I'd share a small selection of the small attributes that I've used so far.

### the placeholder attribute

You can now add the placeholder attribute on form input elements. This will then display the text until the user provides focus to the input element.

    <input type="text" placeholder="Enter your email address"/>

Wow this has made things so much easier. No more extra javascript to remove the value when clicked and then put it back when the user clicks away and it's empty, blah di blah.

### email input type

To better improve what I wrote above, you can now define an email type on input elements. Allowing mobile browsers to show a different keyboard for those elements.

    <input type="email" placeholder="Enter your email address"/>

There are more wonderful attributes to provide browsers with better information on what needs to be entered like 'min' and 'step' for 'number' type input elements. All good stuff, it's great to see browsers implementing more behaviour on the structure of webpages.

### the cache manifest

    <!DOCTYPE HTML>
    <html manifest="/cache.manifest">
      <head>
        <title>Test</title>
        <script src="application.js"></script>
        ...

Offline web pages made simple. Simply add the manifest attribute to html pointing to a web served file. This will setup which files will be available offline. So for this example a file 'cache.manifest' would be created.

    CACHE MANIFEST 
    /application.js

You can even define what is required for network access or even just point to an offline page. Nice.

    CACHE MANIFEST
    FALLBACK:
    / /offline.html
    NETWORK:
    *

This file has to be served as type 'text/cache-manifest'. Read more on cache manifest at [diveintohtml5.org](http://diveintohtml5.org/offline.html). If you use Ruby checkout [Rack::Offline](https://github.com/wycats/rack-offline) to help manage your offline files.

