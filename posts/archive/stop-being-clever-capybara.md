---
title: Software Integration Testing
description: Software Integration Testing
date: 2010-10-27
layout: layouts/post.njk
tags: ["computers"]
---
Today we realised that there was a bunch of functionality being tested that didn't work when javascript was disabled and had to spend a while figuring it out.

We found that it was because of the Rails 3 ability to make links become either HTTP DELETE or POST requests. So when creating a link in rails like this:

    link_to "Delete blog post", blog_post(@blog), :method => :delete

It would output into a html link:

    <a href="/blog/1" data-method="delete">Delete blog post</a>

The `data-method` is a [HTML5 custom attribute](http://ejohn.org/blog/html-5-data-attributes/) by the looks of things. When the page is loaded the default `rails.js` javascript adds an event handler to those link elements to turn it into a form that will actually send a DELETE http request when it is clicked.

When testing these links in [Capybara](http://github.com/jnicklas/capybara) (an integration testing framework) for some reason it performs this javascript behaviour within it's [rack-test driver](http://github.com/jnicklas/capybara/commit/58d4d0ca). **Isn't this wrong?** Shouldn't integration testing be just clicking through the site when javascript is disabled. And when you want to test javascript you use a javascript driver explicitly, like you can in cucumber and capybara:

    @javascript
        Scenario: do something AJAXy
          When I click the AJAX link
          ...

This magic that capybara performs would lead a developer into believing that those links work without javascript but they don't. Sure some people might say why worry about it, most browsers now know about javascript, but what happens if someone chooses to turn it off or it's disabled for other reasons.

Moving forward I'm going to try and steer clear from using the ':method =\> :delete' in rails or monkey patch capybara to stop it changing the test request based on the 'data-method'.

<script src="http://gist.github.com/649000.js?file=capybara_monkey_patch.rb"></script>
