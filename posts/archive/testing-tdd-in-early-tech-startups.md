---
title: Testing (TDD)
description: Testing (TDD)
date: 2010-01-21
layout: layouts/post.njk
tags: ["computers"]
---
As a developer and working on early stage startups I always debate with founders on whether to follow Test Driven Development (TDD) or to just code the idea up and get it out, then later to write tests. I'm going to outline some things that I've found to be advantages and disadvantages.

First I will say that I'm talking about very early stage tech startups, that haven't got a clear idea of how their product will work, revenue/funding or might fail fast due to realisation of one of the many factors, market not ready, target audience don't understand it and won't, low budget runway, etc.

## Advantages of using TDD

### Changes are faster

When a developer wants to change something which you will in a startup, it will be easier with a fully tested application. You will also catch those annoying bugs in unforeseen area of the product when something is changed in another.

### Less time to fix bugs

When trying to fix a bug the developer will be able to isolate the area of code quicker, refactor (change) the code, run tests until it's fixed quickly.

### Quicker developer uptake

If you have to get another developer to work on the code having tests will make it far easier for them to understand what's what and make them feel confident to go in and develop because the tests will catch bad things that might happen.

### Bugs are bad!

Having bugs appear to a limited startup user base isn't good. Seeing a bug might turn them away, thinking it's not solid enough, but they might still stick with you if the idea is great, would they be acceptable?

## Disadvantages of using TDD

### Time

This is the most common talked about issue of fully testing projects. There is an amount of time used up making sure an application is tested. Testing frameworks to be incorporated into the codebase, mocks, test helpers for common actions in an application, this can be mostly at the beginning of the project but can take up essential time.

### You might have a hero

The startup your creating might have a hero (rockstar) coder. One who can just get things out quickly and not bother with tests, therefore saving time to quickly change things and get user feedback. People wanting to make money love heros, for obvious reasons. But I personally think they are bad. If your project takes off and you need a team to carry it, it becomes difficult as that one hero becomes a bottleneck. Check Alex Payne's great article on Don't be a hero for more.

### Money

Startups have limited time, I touched on this above. A quick line of code, hack, etc might be needed very quickly for an important pitch or press release, and if some tests don't pass but the front end of the application works fine, then it might be fine.

### Bugs are acceptable?

I wrote that bugs are bad, but some issues might be acceptable to the founders of the startup. Ones were it might affect only 2% of the users or appear once in a while. Therefore it's ok to not test or have existing tests fail.

### What do I do?

I take each project as they come but push to using testing on all projects. But some people find that this wastes time. So one strategy I've found work well is to test the complex areas of the application and importantly test what the user will see (the front end integration).

Using integration frameworks like [Cucumber](http://cukes.info/), where it revolves around end user features is great. As it allows the parts of the application exposed to the users to be fully tested but for the detailed tests internally to be compromised.

Did I miss something, what do you do?

