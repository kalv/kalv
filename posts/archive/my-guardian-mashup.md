---
title: Guardian Open Data Platform API
description: My Guardian Mashup
date: 2009-03-10
layout: layouts/post.njk
tags: ["computers"]
---
This morning I was invited to the [Guardian](http://www.guardian.co.uk/) at their new shiny office at Kings Cross for the launch of [Open Platform API](http://www.guardian.co.uk/open-platform).

They have created an open API to access all, yes all of their content. It was said at the end that it is in beta and that they will be reviewing registrations for the API key. It's a great playground of information.

They provide methods to search by tags, retrieve items and articles. Even full text search terms too.

This allows developers to mashup applications vertically slicing up data in different ways. What I find brilliant is the tagging they have, you can filter by editorial tags such as /world/barack-obama, /global/reviews, etc. You can read more at their site. So if your trying to create nice content sites, different visualisations of data I do recommend you to look at their API.

I was asked to help with the creation of the [Ruby library](http://github.com/james/custodian) which is a simple start to make it easy for ruby developers to get up and running. With this library I created a mashup which probably took me a day to create.

Guardian Reviews - Is an application that queries Open Platform for the live music reviews, general reviews based on films and reviews. The data made available by the platform then allowed me to search twitter for relevant conversations that took place that are relevant. It is an example app not really a super duper production quality app :) (Update: site no longer up, sandbox taken down)

Thanks to [Tom Armitage](http://infovore.org/) for better designs than my bordered divs!

