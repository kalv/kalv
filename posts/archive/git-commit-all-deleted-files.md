---
title: Git tips
description: Git commit all deleted files
date: 2010-10-21
layout: layouts/post.njk
tags: ["computers"]
---
When deleting a folder or a bunch files from a project that uses [Git](http://git-scm.com/) I've always added the deleted files manually. `git add .` never staged those deletions.

Finally found out a way to just stage all the deleted files. Simply:

    $ git add -u

From `man git-add`

    -u, --update
    
    Only match <filepattern> against already tracked files in the index rather than the working tree. That means that it will
    never stage new files, but that it will stage modified new contents of tracked files and that it will remove files from the
    index if the corresponding files in the working tree have been removed.
    
    If no <filepattern> is given, default to "."; in other words, update all tracked files in the current directory and its subdirectories.

