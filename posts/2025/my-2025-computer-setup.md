---
title: Current Mac OS setup
description: What I'm using for my daily computer setup
date: 2025-04-07
layout: layouts/post.njk
tags: ["computers"]
---

I love my macbook air m2, it's an 8gb, 512GB, blue machine that is portable, has amaing battery and I've used so much over the last almost 3 years.

I've used it on my travels including Mexico City and Puerto Escondido. And I've recently upgraded a number of elements on the computer and setup that I'd like to share.

- Virtualization for C development. I've been using VirtualBox for running a headless ubuntu server and it has been ok. It seems to peg the CPU when the guest machine is running. I've set it up to use NAT, so that it is private network connected. It's been a gem to just open a terminal, ssh in and work in linux whilst still enjoying the smooth mac os experience. This has allowed me to validate C++ program designs a lot faster withouth having to deal with the lib management between Xcode build tools and Homebrew.
- I've found [UTM](https://mac.getutm.app) as an alternative and upon early investigation, it's blazingly fast. I ran an arch linux install and it booted in a second or so. I'm going to use this in the future when requiring a new linux setup to work on. It has images ready to go in a gallery that support arm64 for the macbook air.

- I'm now a convert to Spaces, full screen work. But I had to disable the transitions to ensure that my eyes stay fixed on a point on one space vs another. It now fades between the spaces, you can enable this under Accessibility > Display > Reduce Motion in your System Settings. To switch between the full screen apps, I use the three finger swipe left and right.
- Time Machine backup, now that I've customized Mac OS a lot, I regular take backups of the full machine so that I don't have to note down all the small settings I make on the preferences and utils.
- There are times in which the monitor and laptop turns off when I don't want, and the setting is a little hidden. Mainly when on battery. You can change it to 'never' under 'Lock Screen' under System Settings.
- Oddly there are a number of useful settings for your desktop under 'Control Center' in your System Settings. Mainly to hide the top toolbar, as I find myself looking at the clock in the top right too much.
- [Ice](https://github.com/jordanbaird/Ice) - A Powerful menu bar manager. It has allowed me to compact my toolbar icons such that I show the most important only on a 13" screen. Well built and someone I will donate money to later.
- [Stats](https://github.com/exelban/stats) - To bring me back to my university days, I wanted to have network traffic and CPU visible in the toolbar. Stats allows that and more, it's been great to catch a process that is running the CPU too much or even an application that is downloading too much data.
- [Lulu](https://objective-see.org/products/lulu.html) - Lulu allows for management of network rules and traffic. It shows a popup for any new application attempting socket connections and you can add rules.
- [Oversight](https://objective-see.org/products/oversight.html) - This is a must application to install. It will highlight what application is using your camera and when it's on and off. I've found in the past applications continue use the camera or microphone after they've stopped their UI.

I'm still using a tmux and vim like I always have since 1994. Always allowing me to use my fingers at the keyboard and no mouse. Configured for fast windowtabs and vertical splits as required between the code and a terminal. 

Current vim plugins:
- [ag.vim](https://github.com/rking/ag.vim) - Using the silver searcher with fzf for the fast lookup of files in a project
- [ale](https://github.com/dense-analysis/ale) - for async syntax checking 
- [vim-fugitive](https://github.com/tpope/vim-fugitive) -for the rare times I need to do a GRead to read the original file from the git repo
- [Gruvbox](https://github.com/morhetz/gruvbox) - my main color scheme in Vim but also iTerm2. I find the colours work the best for both night and day. Dark mode.
- [FZF](https://github.com/junegunn/fzf) - Fast Fuzzy Finder for vim, I have it bound to my <leader> p and it allows for fast file finding and switching.

I use [Powerlevel10k](https://github.com/romkatv/powerlevel10k) for zsh, it's the best to easily get setup and I love that you can easily configure the prompt, statuses on the right after a command is ran, like how long it took to run.

Alongisde my stellar mac setup, I've been using [Google Gemini](https://gemini.google.com) a lot, it's amazing and free! I find that the answers for programming reference questions are superb. It's ability to create code has been great to get applications started fast. So far I've been using it the most with Rust and JavaScript.
