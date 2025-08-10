---
title: Smaller Digital Images
description: How to make your images smaller than JPG
date: 2025-01-30
layout: layouts/post.njk
tags: ["computers"]
---

I've been investigating a number of techniques in computer science to reduce the footprinte of image frames for my new video service that I'd like to release. My mission to make multiple streams be able to viewed from Formula 1 on the same amount of bandwidth used today for their livestream and if possible higher quality and higher frame rates.

For now, I'm going to share that we should all be using AVIF image formats. It's unbelievably amazing for something that every machine already has.

Take this image of kyoto, it was originally 17M as a high resolution TIF that I had scanned from slide film (Fuji Velvia) from a trip I took in 2005. And when it’s converted from a high resolution lossless image, like a TIF or PNG. It won’t work with converting a compressed image such as a JPG. After it’s converted to AVIF, it’s lossless and 180kb. The same resolution and quality. If you don't check, the image resolution is 3000 × 2008.

![/img/posts/2025/kyoto.avif](/img/posts/2025/kyoto.avif)

For the geeks, it's as simple to use `imagemagick` by running `convert image.tif image.avif` and it'll work. You can install that with homebrew on a mac.

This [article from Jake Archibald](https://jakearchibald.com/2020/avif-has-landed/) goes through AVIF in detail and has some great images of formula 1 cars to highlight how great the image file format is compared to many image formats. I think it's the future of images on the web.

My challenge with the file format is that the compressor I use with ffmpeg is quite slow and do need to find a faster compressor, one that perhaps takes advantage of the Apple Accelerate SDK or GPU in some way.
