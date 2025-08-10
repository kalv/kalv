---
title: Faster avif compression
description: Discovered a faster AVIF compression library.
date: 2025-04-17
layout: layouts/post.njk
tags: ["computers"]
---

I've been searching for a faster method to compress AVIF image files, due to it's amazing ability to make such small image file sizes, as [I posted earlier](/posts/2025/smaller-images/) from large PNG files.

I've found that the `libavif` contains an encoder that works on the CLI that is faster than `ffmpeg` that I've been using.

[https://github.com/AOMediaCodec/libavif](https://github.com/AOMediaCodec/libavif)

Today my test with this encoder encoded my 50Mb test images in 1sec to around 700kb, retaining great quality that would be excellent for prints.

Enjoy.
