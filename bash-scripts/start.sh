#!/usr/bin/env bash

cd /home/brandonburke_personal/dm-cash
pm2 start index.js --kill-timeout 15000
