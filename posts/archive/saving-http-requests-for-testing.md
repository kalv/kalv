---
title: Saving HTTP requests for testing
description: Saving HTTP requests for testing
date: 2009-10-13
layout: layouts/post.njk
tags: ["computers"]
---
I have been working with quite a few HTTP API services, so testing has been fun. Setting up lots of mock responses from URL endpoints.

Some gems like, twitter, bitly, etc have the URL's hidden in their guts and without reading around the twitter/bitly api docs you won't know, to help and save time I wrote this module to help override net/http and save the http response. The ruby library net/http seems to be used in most gems.

You can include the http headers (haven't tested fully and loading), for testing redirects/errors. Thought I'd share with others and see if you find it useful.

<script src="http://gist.github.com/209380.js"></script>
