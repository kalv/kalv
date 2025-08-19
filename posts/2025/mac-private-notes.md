---
title: Mac private notes
description: Using GoCryptFS to store private notes
date: 2025-08-19
layout: layouts/post.njk
tags: ["computers"]
---

I've been looking for a better way to store private notes and really most of the time, just note designs, architectures and computer programming progress in markdown files.

When I was travelling in Puerto Escodido in November 2023, I used this method and have returned to it. I'm using [GoCryptFS](https://github.com/rfjakob/gocryptfs), which takes a little fiddling to install but once it is. You can simply run these commands and I'm able to have a folder encrypted and backed up across iCloud and TimeMachine.

`gocryptfs -init ./data` for a new folder to be setup as an encrypted data store.

Then to mount it to another folder I simply run `gocryptfs data notes` where notes is a folder in the same directory. Then to unmount it `umount notes`.

Perhaps one day we can to use the private System Keychain and our finger print. It be accessed via the Secure Enclave via TouchID, such that you wouldn't require a password and always be able to de-crypt your notes/data. I've parked this for now in the ever growing list of designs and concepts for the future apple eco-system.
