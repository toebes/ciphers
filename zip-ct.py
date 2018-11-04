"""zip-ct.py
Zip the CipherTools website which is built with webpack.  The CipherTools.zip file
can be downloaded and opened in a browser for offline use.
"""

from __future__ import print_function

import argparse
import os
import shutil
import zipfile

def zip_cipher_tools(the_zip, the_directory):
    relroot = os.path.abspath(os.path.join(the_directory, os.pardir))
    print(relroot)
    for root, dirs, files in os.walk(the_directory):
        # Add directories to zip
        the_zip.write(root, os.path.relpath(root, relroot))
        for file in files:
            filename = os.path.join(root, file)
            if os.path.isfile(filename):
                # prepend the file's path.
                arcname = os.path.join(os.path.relpath(root, relroot), file)
                # write the file to the zip with its relative path.
                the_zip.write(filename, arcname)

if __name__ == '__main__':

    parser = argparse.ArgumentParser(description='Zip CipherTools website for offline use',
                                     formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument('version', help='The version string to append to the zipped directory name.')
    args = parser.parse_args()

    # The version should be in format x.y.z
    # This could be validated to make it more robust.
    version = args.version

    # Make a directory name that includes the current version.
    ciphertools_dir = 'CipherTools-'+version

    try:
        # Delete CipherTools.zip if it already exists in dist directory...
        if os.path.exists(os.path.join('dist', 'CipherTools.zip')):
            os.remove(os.path.join('dist', 'CipherTools.zip'))

        # Rename dist to the version directory
        shutil.move('dist', ciphertools_dir)

        # Create the zip file, the zip file name is of versionless so the download code
        # can just refer to the generic name.
        dist_zip = zipfile.ZipFile('CipherTools.zip', 'w', zipfile.ZIP_DEFLATED)
        zip_cipher_tools(dist_zip, ciphertools_dir)
        dist_zip.close()

        # Alternate method, but it does not include the 
        # 'CipherTools-x.y.z' directory name in the zipfile.
        #shutil.make_archive('CipherTools', 'zip', ciphertools_dir)

    except Exception as x:
        print('An error occurred creating zip file for CipherTools version: ' + version)
        print(x)
    finally:
        # Put dist back
        shutil.move(ciphertools_dir, 'dist')
        
        # Convienently locate CipherTools.zip to dist directory, for uploading to website.
        if os.path.exists('CipherTools.zip'):
            shutil.move('CipherTools.zip', 'dist')
        else:
            print("CipherTools.zip not found!  Possible error creating it?")
