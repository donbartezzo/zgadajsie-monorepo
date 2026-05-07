#!/bin/bash
set -e
export NODE_OPTIONS="--experimental-vm-modules"
jest --config libs/jest.config.ts "$@"
