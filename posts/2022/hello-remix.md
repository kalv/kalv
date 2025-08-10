---
title: Alternative JS frameworks
description: Alternative JS frameworks
date: 2022-08-05
layout: layouts/post.njk
tags: ["computers"]
---

I've been making things for the web since mid 90s. Static HTML, server side rendering (cgi-bin, dyanmic languages), mobile, and front end rendering. For the most time, my default stack has been Ruby & Rails. Love all that it has brought to everyone and my career.

With my current product, I've been reviewing new stacks that are faster, more fun to use, attractive to developers & designers, and have growing communities. So thought I'd share a bit about it.

I've found in the last couple of years, I've been working with React developers and Frontend development teams. Through that I've seen the power that comes from a thriving front end community that have many React based examples, workflows and expertize. It's a given today, that a UX developer will know React, most if not all design systems are designed to work with React. Examples from Figma or other animation styled components tend to be in React.

One important aspect for our new company is to attract and retain the best talent. I'm aware that there is startup risk with a bold vision, so want to make sure developers working with us can have fun and walk away with experience that will be invaluable to them in the industry. On Hacker News, the who is hiring posts show a clear signal for the uptake of React ([hnhiring.com](https://hnhiring.com)).

Rails is taking a great approach in getting back to [basics with web development](https://world.hey.com/dhh/modern-web-apps-without-javascript-bundling-or-transpiling-a20f2755). There is also a lot of investment in Web Components; even I have advocated for web components in specific strategies that require a clear need for interoperable use of them. Front end developers out there are not adopting these techniques though. I start to feel that perhaps it's the old timers that want to bring back simplicity, but in reality it doesn't matter. Using a bundler is fine, similar to how programming languages introduced a VM (Java vs C). There are problems and issues with NPM and other aspects of the Javascript ecosystem, but all development language have their issues.

It was clear that we needed it to be a React app. I selected two growing frameworks to compare, [Remix](https://remix.run/) and [Redwood](https://redwoodjs.com/). I didn't add [Next JS](https://nextjs.org/) to my list; don't really have a great reason, so I could be missing out on that ecosystem but felt that Remix and Redwood would have the latest innovative approaches for modern web development.

## Redwood

I started with Redwood. There were a number of reasons that I liked it.

* Love their mission, "Focus on building your startup, not fighting your framework.". Very similar to Rails.
* It's a full stack framework, not just front end. Includes aspects beyond just the front end React, including API, Database, service worker
* Scaffolds, and a lot of nice features to allow rapid construction like their [Forms](https://redwoodjs.com/docs/forms) helpers, logging, testing, mocking and much more. They have pretty much all things covered.
* The documentation is excellent, well written and goes into the details well.

After starting to build a prototype, I quickly learnt that Redwood won't be the stack for us. For a couple of reasons.

* Perhaps a personal preference. I don't like GraphQL. I feel it's overkill for most web applications that don't require the API to be consumed by multiple clients. But if you do, Redwood makes it really easy to define the schema and models.
* Their [cells](https://redwoodjs.com/docs/cells) concept ended up making too many front end calls. I might've been doing something wrong. The added latency and time taken to compose the page took too long.
* I had to debug some prisma issues and found that working with Prisma directly vs the redwood client was easier. Which led me to conclude that the redwood level of abstraction was not that great, would rather just use Prisma directly.

My conclusion of Redwood is in no way a judgement of how well they are executing on their approach, it's amazing. But more of a preference of architecture for the first version of our application we want to build. I don't want to build it with a GraphQL API, introducing overhead that isn't required at the stage we're at.

## Remix

I had been following Remix when they were a paid for early preview. Mainly due to the amazing [Michael Jackson](https://github.com/mjackson) and [Ryan Florence](https://github.com/ryanflorence) working on it.

The key areas that jump out for Remix.

* If you haven't already, read their [philosophy](https://remix.run/docs/en/v1/pages/philosophy). Considering Server/Client model again (yay!), they had gained experience when building a full thick front end client for Twitter and learnt from that.
* Probably the most important in their philosophy is, "don't over abstract". Allowing maintainability, customization and optimizing much easier in the long run. Less moving parts. And building on fundamental Browser/HTTP/Javascript technologies.
* Even though they are not full stack, they have amazing [Remix Stacks](https://remix.run/docs/en/v1/pages/stacks) to help developers get started with great conventions in place (such as Prisma, deployment).

I went ahead and started building a prototype with the [Blues stack](https://github.com/remix-run/blues-stack), and quickly realized that this is the stack that I'll be building with.

* The philosophy really resonates with me, in how building for the web should be. Such as the use of just normal form post data.
* Picking and choosing the specifics in the stack worked better than Redwood. The Blues stack got things going, but not having a lot of abstraction means we can change things as we need. An example of this was how I easily upgraded Prisma to use their latest features.
* Discord and community up take is large. This is important for us as we have an ambitious mission and want to make sure we can find the talent to deliver on it.
* Performance. Compiling pages on the server with ease with their data loaders, reducing latency overhead makes sense.
* Feels simple in how it's put together, allowing for me to break it apart and see what's going on. Such as the nested routing or API routes.
* Like how the business logic is in a route. It's similar to fat models (services), thin controllers. Making it easy to read and work with.

There are some areas I have yet to work through such as background work but am confident that the architecture will form itself, following the philosophy set with Remix.

If I get time, I will share again how it goes building out Path.dev.
