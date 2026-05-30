#!/usr/bin/env bash
set -e

node bin/swarms.js open --help
node bin/swarms.js open 162975eb-61f7-4416-ac01-7d87ea67761f || true
node bin/swarms.js open --type agent --print 162975eb-61f7-4416-ac01-7d87ea67761f
node bin/swarms.js open --type agent eb997536-2622-4428-a9c2-d082abe7ef06
