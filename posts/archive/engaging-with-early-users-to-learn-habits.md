---
title: Modern Human Computer Interaction
description: Gaining insight on user interactions
date: 2012-04-12
layout: layouts/post.njk
tags: ["computers"]
---
As I've been working to get our startup [Goodbits](http://www.goodbits.co) up and running I've been using many different tools to get as much insight on our customers activity. The one tool that I've been using the most has been [Kissmetrics](http://www.kissmetrics.com) which has allowed me to look at specific events or actions that a user carried out on the site. Making it far more useful than the popular choice of [Google Analytics](http://google.com/analytics) or similar.

It has been very important to learn what daily habits our users are carrying out, so the better information I can compile the better I can deduce common usage patterns that I have to improve and refine. Check out [this post from Nir](http://www.nirandfar.com/2012/04/hooking-users-in-3-steps.html?utm_source=feedburner&utm_medium=feed&utm_campaign=Feed%3A+NirAndFar+%28Nir+and+Far+Blog%29) which is an interesting read on Habit forming.

Now there is a new kid on the block and I'm loving it. [Intercom](http://intercom.io), a web app that is a CRM (Customer Relationship Management) Tool on my customers with some serious powerful features.

## How it works

Like with most of these services, you drop in a javascript snippet into your application and then set a bunch of settings, the email address of your signed in user, etc. By default Intercom then records information like 'signed up', 'last seen at', the number of 'sessions' & then looks up more information on that customer.

    var intercomSettings = {
      app_id: 'app_id',
      email: 'john.doe@example.com', // TODO: User's e-mail address
      created_at: 1234567890, // TODO: User's sign-up date, Unix timestamp
      name: 'John Doe'
    };

The added lookup on information is that it uses [FullContact](http://www.fullcontact.com/) to link to their social media profiles, this gives you better insight of the type of user they are. It's great, with a couple of clicks I can see what field this customer works in, how interactive they are with certain social media tools and better understand the types of customers we have using our product.

> "Whoa, this feels like getting a message from God"

It doesn't stop there, the interface is very well designed allowing me to filter by data stored for a user and then **message** them, yep message them. Either directly so that when they next use my site a popup would appear or through email.

I've always hated spam messages from an app I use, this filtering allows me to target specific behavior and I have seen that users engage back with us more than they would with a generic mail shot from [MailChimp](http://mailchimp.com/).

I have more confidence that they will engage back with me. Intercom have a column in their app with a **heart** in it for relationship.

## Getting more from Intercom

You can also add custom information to intercom, which then allows you to further filter your users.

    var intercomSettings = {
      // .. add this
      custom_data: {
        'invites sent': 4,
        'has added twitter service': true,
        'number of sections created': 5
      }
    };

This can be quite intensive on your to render this data out on every request, so instead of caching it, I am posting this data in a scheduled task hourly using their API and [Rubygem](https://github.com/intercom/intercom-ruby)

## Auto Messaging

You can now set up filters and then create an auto message which be sent out to customers that fall into that filter. I am using this for some great scenarios, ones where I've before written manual code to fire emails.

- Ask users why they haven't come back to our application after a period of time to better understand what it is we're not doing right
- Send targeted messages describing what they can do with our tool that they haven't already enabled and if they didn't use those features, why.

## Constantly improving

They are adding improvements all the time, I wanted auto messages and it was something they released. I wanted to use my custom data in generated messages, deployed and notified. I wanted to easily see the number of emails being sent from their auto messages features, they updated the interface and deployed it. This reaction to customer needs is what I try to do with products I work on, so using a tool that do this for me, is satisfying.

I decided to write this post because Intercom is starting to become a must have for me in building web products. It's starting point in reviewing analytics is great, the customer.

