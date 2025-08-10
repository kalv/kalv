---
title: My Macvim setup
description: My Macvim setup
date: 2010-11-29
layout: layouts/post.njk
tags: ["computers"]
---
I have been spending some time over the last week of so with macvim. Thought I'd share my experiences so far.

### Why

I wanted to play around with VIM again really, one day a team member reminded me of the 'c-w' vim command when working on a server (it clears the word from the start of it). At this point I remembered the power that vim has and I wanted to get back to that and see if it would make it easier for me to edit and write code.

I also felt a frustration when moving from keyboard to mouse. Could I be as productive and not have to touch the mouse (perhaps still use to explore around a project directories).

Some people could argue these pains might not be enough to justify switching or spending the time to learn a new tool. I just thought I'd give it a try, I can always switch back to my long time home [textmate](http://macromates.com/).

### Setting it up

I simply installed macvim through [homebrew](https://github.com/mxcl/homebrew) `brew install macvim`. If you don't use homebrew to manage your packages on your mac, i seriously advise you to look into it.

Once that was installed I installed the color [IR\_Black\_theme](http://blog.infinitered.com/entries/show/8) to make it look a bit prettier than the default (I prefer dark backgrounds).

I pulled parts of the `.vimrc` and `.gvimrc` from this [repo from railsjedi](https://github.com/railsjedi/vimconfig) (found by just searching github for macvim).

The main plugins I installed were:

- `ack.vim`: Allows me to search the project using ack, similar to AckMate. To use it in vim I would `:Ack search_for_this`, i have now setup a mapping for my lead key and character (a shortcut really to the command)
- `bufexplorer.vim`: This is a neat way to browse what files you have open in the buffer. I use this with a lead key shortcut too. Allowing quick switching files.
- `rails.vim`: A rails plugin that really I find the syntax highlighting helpful, it does provide other things but i haven't used them much.

A note on NERDTree, I started using this plugin which helps with directory navigating. But dropped it to use the included netrw in vim, it seems to do everything I need for now and thought it best to learn as much of the real tool as possible.

So on to the findings.

### :( Go to File / Peepopen

The first thing that became apparent was not having a `Go to File`, the Command-T option that would list the files in your directories and allow you to quickly go to a file.

I have been using [peepopen](http://peepcode.com/products/peepopen) in textmate for this and it works with macvim! You simply switch the editor and reload, works really easily.

### :) Love split screen

Splitting the code on a 23" screen helps for both showing test with code and view with controllers/models. I think this is a preference thing, I myself like it. Even when just learning new code from a project having the ability to have multiple windows makes it easier.

### _:)_ Shortcuts for text and visual mode

To remove and move text with commands on the keyboard is probably the most thing i've used. Having the ease to delete to the end of line and start writing, delete just the word or a couple and then having the visual mode helps too. Sure there is shift select in textmate for visual mode, but holding down the shift sometimes (not all) is annoying.

### :( Running tests

When in a rails project using textmate I would always run a focussed test and window popup would open. With the vim setup I haven't found an easy way to do this. I have to switch to a terminal and run the test: `ruby -Itest test/blah -n '/the test to focus on/'`. This slows things down a little by only the fact that running a new focussed test means writing out the matcher, obviously repeating a test is quick, just means alt-tab, up and bang to run the command again.

### :( No markdown preview

Recently I've found myself writing more markdown and liked the ability to preview the page in textmate. Haven't really looked if there is anything nice for vim on this.

### :( Esc to complete

I barely used this in textmate, but have found myself wanting it now and then. It autocompleted the word you were writing when you pressed esc.

### :/ To tab or not tab.

I'm finding it hard to decide on whether to open files in multiple tabs or to just switch between the buffers, this just get's messy that's all, i will eventually figure it out.

### :) Even more fun to code

Learning something new with vim is fun and adds to the fun of doing the work I do. So for me this is a plus.

### :) Remote developing.

I love the potential of using vim not just the macvim version on remote machines for pair development or even lightweight client's being able to develop by using a remove machine having components installed (ipad for example).

### Conclusion

I'm going to continue using Macvim, as I'm loving what you can do to the text in visual mode and the ability to delete and move lines/words around on the keyboard.

What do you think? Would you try or already use Macvim? Have any tipes?

