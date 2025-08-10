---
title: The fastest Ruby RSS Parser
description: The fastest Ruby RSS Parser
date: 2010-12-10
layout: layouts/post.njk
tags: ["computers"]
---
I was working on a project the other day that needed to parse a lot of RSS feeds and would need to poll & parse them frequently. So once again I had the question 'which ruby rss parser should i use?' in my mind.

Back when I was working for [twitterfeed](http://twitterfeed.com) we performed some testing to find the optimal library that could fetch and parse the feeds fast. It was found then that [Feedzirra](https://github.com/pauldix/feedzirra) performed the best as you could use a multiple fetch using [curb](http://curb.rubyforge.org/).

For now I only wanted to know how fast these libraries would just parse the feeds, I was not worried about the http fetching.

I had some time so I returned to a nice performance test suite created by [Julien Genestoux](https://github.com/julien51) of [Superfeedr](http://superfeedr.com/).

I forked the suite, updated it to use bundler, order the results and to use the latest gems and then re-ran the performance test. You can find my fork [here](https://github.com/kalv/ruby-feed-parser-benchmark) if you are interested.

The results were (ran on my macbook pro 2.53ghz, 4gb ram, SSD):

    ruby feed-parser-bench.rb 1000
    
    feedzirra => Average: 0.0278322427572428 (0 errors) RSS: 0.0260872052845528 Atom: 0.0295189980353635
    mrss => Average: 0.042981384305835 (7 errors) RSS: 0.039129512244898 Atom: 0.0467262599206349
    syndication => Average: 0.0495069849548646 (4 errors) RSS: 0.0398204020408163 Atom: 0.0588687712031558
    rfeedparser => Average: 0.452556951048951 (0 errors) RSS: 0.389084115853658 Atom: 0.513909868369352
    simplerss => Average: 1.29865328871129 (0 errors) RSS: 0.20822887195122 Atom: 2.35265881532417

The result was simple - Feedzirra was still the fastest.

