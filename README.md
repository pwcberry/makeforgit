# makeforgit

A simple command line tool for generating files to understand git's commands at work.

Options:

	makeforgit filename [--number] [--index] [--append] [--commit] [--one]

	filename        The file name prefix
	-n, --number    The number of files to generate
	-i, --index     Specify the file index to modify
	-a, --append	Append template to file specified with index. If the template doesn't match a pre-exiting one, the argument value is used
	-c, --commit	Commit all files as one snapshot
	-o, --one       Commit each file as an individual snapshot. Use with --commit


## Installing locally

You must have node installed.

1. Clone the repo
2. `cd` to the directory
3. Execute `npm init` to generate the symlink
4. Open a new shell
5. `cd` to the demo directory
6. Play!

