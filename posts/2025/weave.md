---
title: Faster video encoding
description: Faster video encoding
date: 2025-02-04
layout: layouts/post.njk
tags: ["computers"]
---

Outlining how to faster encode dvd rips or MP4s on a macbook air m2 (the base model, with just 8GB RAM) at 500fps you can use Handbrake with some specific settings to utilize the optimized ARM processor.

I’ve been ripping Battlestar Galactica and other old series I’ve want digitized. Use [Handbrake](https://handbrake.fr/) and then use these settings:

Pick the Video Encoder of H.265 (VideoToolbox), it’s the optimizations of using the VideoToolbox mac native libraries to ensure faster encoding with low power consumption. And you can use any other quality settings you’d like. I’m sure this encoding would run faster on a macbook pro or other modern versions of the mac. It would be great to see more software optimized for this.

Design for optimized video, using what I was calling Weave. A project that I didn’t get funding for last year. And really doesn't work. I spent 2 years working on this project to find a better storage solution for Images such that the pixels could be re-used as an attempt to save space but really it doesn't work. It was a great exercise of research and exploration on early formats of multimedia which might lead to something else in the future. Essentially I found that using the file format Avif gave me great image compression and that there is opportunity to implement faster encoding of those images with the work from someone like Apple. 

1. Essentially we can store a map of the pixels used in an image, for this walkthrough, I’ll say it’s a blue sky image. An image of just shades of blue.
2. These shades of blue could be extracted into a one line image buffer and those pixel references can then be used to draw out the image using GPUs or fast CPU optimizations
3. Meaning the data footprint of an image frame is much smaller than what is currently stored

Enjoy.
