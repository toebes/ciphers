#! /usr/bin/env bash

# Simple script to make the CipherTools.zip file.  It puts the 
# files in a directory with the current version number, so users
# can tell what version they are running by looking at the
# directory name.

# set -x
version_string=`grep "\"version\":" package.json | cut -d'"' -f4`

ct_dir="CipherTools-$version_string"

temp_dir="/tmp/$ct_dir"

my_dir=`pwd`

# should not exist, but just in case...
if [ -e $temp_dir ]
then
    rm -rf $temp_dir
fi

mkdir -p $temp_dir

# Copy built files to temp dir
cp -r dist/* $temp_dir

pushd /tmp

# Zip the nicely named dir we created in /tmp
/usr/bin/zip -uro $my_dir/CipherTools.zip $ct_dir

popd

# Clean up /tmp
rm -rf $temp_dir