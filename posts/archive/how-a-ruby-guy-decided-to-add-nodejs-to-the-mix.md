---
title: Adding Node.js to Ruby/Rails
description: Adding Node.js to Ruby/Rails
date: 2012-01-17
layout: layouts/post.njk
tags: ["computers"]
---
I've been a Ruby guy for over 4 years now and have always found the language fun and the frameworks suitable for building web based applications, I love it.

Since the release of [Node.js](http://nodejs.org) in 2009, I and my colleagues at [GoFreeRange](http://www.gofreerange.com) were very excited about the event loop, non-blocking IO goodness for scalability and speed on the web. We had even played on something to help[testing](https://github.com/freerange/nodetest) (was only for a day, just to learn more about the tech).

So I've been looking for the right time to start developing a real application that benefits from what Node.js has to offer over what I can do quickly and efficiently in Ruby.

I have yet to see an API or website really need the scalability or speed offered by node.js over what I know with ruby, so I've always chosen to use what I know, has good conventions and good maintainability.

But last week the time finally arrived where Node.js might be a better fit.

This won't be a post outlining benchmark metrics but just an overview of my findings and how I settled on Node.js for this specific need.

## The problem

Our feed checking mechanism at [RSS Hero](http://rsshero.com) was built using [Resque](https://github.com/defunkt/resque) so that we could fetch multiple feeds and check them (making sure they are a feed). Then to subscribe with [Superfeedr](http://superfeedr.com) if successful.

This process was not fast enough for fetching lots of feeds, I found that activating a couple of users that each had 1000 subscriptions or so, it would stack up and take quite a while to churn through.

Even though I could increase the number of resque workers running in parallel I would end up using more memory on our limited production servers.

HTTP feed fetching is going to increase, one of our upcoming milestones is to take load away from superfeedr and fetch some feeds ourselves.

## Proposed Solutions

To make this faster I needed to use less memory and be able to fetch multiple HTTP requests in parallel. The shortlist that I came up with was:

- [Eventmachine](http://rubyeventmachine.com/) & [em-http-request](https://github.com/igrigorik/em-http-request) - A ruby event loop allowing async processing
- [Typhoeus](https://github.com/dbalatero/typhoeus) - Http fetching using curb (curl)
- [Node.js](http://nodejs.org) - event driven, non-blocking IO

So to figure out which was best I set a time box of 1/2 day to spike on each method and learn about them.

With each test setup I used [Redis pubsub](http://redis.io/topics/pubsub) to push urls to be fetched onto a channel and have the fetching code consume that channel. This would allow easy integration from the existing rails app.

Also to remove bandwidth fluctuations from my ISP I ran the tests on a [Linode](http://www.linode.com/) server.

## Eventmachine

This was my first choice and I believed it would be good enough for our needs. I would be able to use my existing tested ruby code for the feed checking and connect it to redis.

The first issue and main one was eventmachine kept on stalling. When the sample data was loaded, the compatible redis library ([em-hiredis](https://github.com/mloughran/em-hiredis)) would read off all the messages off the pubsub channel and kick off http requests, responses then stopped after the first 100 requests.

I thought it might be an issue with trying to send too many requests at one time. So I tried using [em-synchrony](https://github.com/igrigorik/em-synchrony) which is a lovely library to allow synchronous control in the event loop, but it stopped the async nature of the http requesting so slowed it back down.

To better manage the concurrency I then tried to store the received urls from redis into a shared variable and then poll that collection (EM::PeriodicTimer) and only fire off a limited amount of http requests. This worked well until 300-400 requests were sent, again eventmachine stalled for a 1-5 secs and then came back again.

After spending a bit of time debugging and digging into my limited knowledge of Eventmachine and em-http I couldn't see what was happening. All I could see was that the event loop was not 'ticking', the timer was not firing so maybe something had blocked the IO loop. Using 1000 requests to a localhost web address worked fine, so maybe it was something in the network layer, maybe an address not returning, DNS hanging. I did find evidence to show that the HTTP Connection was [not fully asynchronous](https://github.com/igrigorik/em-http-request/blob/master/lib/em-http/http_connection.rb#L75) so perhaps one or a couple of network connections were blocking.

I fiddled with adding timeout settings to the http request but nothing stopped hitting this stall.

With my limited time for this spike and this stability issue I moved on.

## Typhoeus

I have used curb before for fast feed fetching at[Twitterfeed](http://twitterfeed.com), where I used a modified[feedzirra](https://github.com/kalv/feedzirra) that allowed multiple http feed fetching, this worked very well at the time.

Comparing this though to the speed I was getting with Eventmachine it was slow, a fire off of 10 http requests would still wait for them all to return, which was too slow.

Again I had to manage my own concurrency when reading urls to be fetched from redis.

This being too slow, I moved on to node.js.

## Node.js

Already knowing javascript, I got it running pretty quickly and the responses came through fast. I can't say exactly but it responses for for the first hundre came through a lot quicker and it stayed consistently fast.

I didn't have to worry about concurrency control, internally node.js seemed to manage and handle the requests fine.

I had to write my own code to handle redirects and to put a cap on how many to follow before throwing an exception as I was using the http request library included in Node.js.

The results from the little testing on Node.js was amazing. It felt solid and fast. This was enough for me to take the plunge and deploy some node.js.

## To Summarize

I chose to use node.js because it was faster, stable and used a lower memory footprint on my server.

[RSS Hero](http://rsshero.com) is now using node.js for it's http fetching and memory usage has reduced from 400mb of RAM to 20mb and it's a lot faster.

