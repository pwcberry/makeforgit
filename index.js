#!/usr/bin/env node

'use strict';

var fs = require('fs');
var cp = require('child_process');

var Template = {
	'array': 'var teams = { \'KitKats\': [], \'Infinity\': [], \'TickleMyCode\': [] }; \n',
	'bug': 'var beers = [\'Czech\', \'Belgian\', \'Polish\', \'Croatian\']\n',
	'for': ('for (var i = 0; i < count; i++) {\n' + '    teams[i].doSomething();\n' + '}\n'),
	'if': ('if (isAwesome(teams.TickleMyCode)) {\n'+ '  goDrinking();\n' + '}\n'),
	'console': 'console.log(\'This team is awesome: \' + team.Infinity);\n',
	'while': 'while (!isDrunk(team.KitKats)) {\n    goDrinking(team.KitKats);\n}\n'
}


function random(a, b) {
	return isNaN(b) ? 
		Math.floor(Math.random() * a) :
		(a + Math.floor(Math.random() * (b -a)));
}

function timestamp() {
	return (new Date()).toISOString().replace(/\D/g,'').substring(0, 14);
}

function generateRandomChanges(count, filenamebase, extension) {
	var index = 1, result = [], filename, number, data;
	while (index<=count) {
		filename = filenamebase + index + '.' + extension;
		number = random(1000, 10000);
		data = 'var howAwesome=' + number + ';\n';

		fs.writeFileSync(filename, data);
		result.push({file: filename, data: number });
		index++;
	}

	return result;
}

function appendChanges(filenamebase, extension, index, template) {
	var filename = (filenamebase + index + '.' + extension),
		contentToAppend = ('\n// ---\n\n' + (Template[template] || (template + '\n')));

	fs.appendFile(filename, contentToAppend, function(err) {
		if (err) {
			throw err;
		}
	});

	return [{file: filename, data: '' }];
}

function commitAllToGit(files) {
	var gitAdd, 
		gitAddCommand = 'git add',
	 	commitMsg = 'Random changes to ' + files[0].file.replace(/\d+\.js$/, '*.js. ') +
	 				'Committing all at ' + timestamp();

	 files.map(function(x){
	 	gitAddCommand+=' ' + x.file;
	 });

	 gitAdd = cp.exec(gitAddCommand, function(err, stdout){
	 	var gitCommit;
	 	if (!err) {
	 		// Pipe git output
	 		console.log(stdout);
	 	} else {
	 		console.error(err);
	 	}

	 	// Quit process
	 	gitAdd.stdin.end();

	 	if (!err) {
	 		gitCommit = cp.exec(('git commit -m "' + commitMsg + '"'),
 				function(err, stdout){
 					if (!err) {
	 					// Pipe git output
 						console.log(stdout);
 					} else {
 						console.error(err);
 					}

				 	// Quit process
 					gitCommit.stdin.end();
 				});
	 	}
	 });
}

function addGitAction(filename, data, next) {
	return function() {
		var gitAdd, 
			commitMessage = typeof data == 'number' ? 
				('git commit -m "A random change of ' + data + ' to "' + filename +'"') :
				('A cruisy modification to "' + filename + '"');
		
		gitAdd = cp.exec(('git add ' + filename), 
			function(err, stdout) {
				var gitCommit;

				if (!err) {
					console.log(stdout);
				} else {
					console.error(err);
				}
				gitAdd.stdin.end();
				
				gitCommit = cp.exec(commitMessage, function(err, stdout){
					if (!err) {
						console.log(stdout);
					} else {
						console.error(err);
					}
					gitCommit.stdin.end();

					if (typeof next === 'function') {
						next();
					}
				});
			});
	};
}

/**
 * Build up the actions that each subsequent action
 * can be passed into the next, a bit like the 
 * "Command" pattern.
 *
 * We can ensure that git executes safely in a child process,
 * without conflict.
 */
function commitToGit(files) {
	var actions;

	files.forEach(function(x, index) {
		if (index == 0) {
			actions = addGitAction(x.file, x.data);
		} else {
			actions = addGitAction(x.file, x.data, actions);
		} 
	});

	actions();
}

var optionConfig = require('nomnom')
	.script('makeforgit')
	.option('filename', {
		position: 0,
		help: 'The filename prefix'
	})
	.option('number', {
		abbr: 'n',
		help: 'The number of files to generate'
	})
	.option('index', {
		abbr: 'i',
		help: 'Specify the file index to modify'
	})
	.option('append', {
		abbr: 'a',
		help: 'Append template to file specified with index. If the template doesn\'t match a pre-exiting one, the argument value is used'
	})
	.option('commit', {
		abbr: 'c',
		flag: true,
		help: 'Commit all files as one snapshot'
	})
	.option('one', {
		abbr: 'o',
		flag: true,
		help: 'Commit each file as an individual snapshot. Use with --commit'
	});

var opts = optionConfig.parse();
var files;

if (!opts.filename) {
	console.error(optionConfig.getUsage());
	return 1;
}

if (opts.number) {
	if (isNaN(opts.number) || (opts.number <= 0)) {
		console.error(optionConfig.getUsage());
		return 1;
	}

	files = generateRandomChanges(opts.number, opts.filename, 'js');
}

if (opts.index) {
	if (isNaN(opts.index)) {
		console.error(optionConfig.getUsage());
		return 1;
	}

	if (opts.append) {
		files = appendChanges(opts.filename, 'js', opts.index, opts.append);
	}
}

if (opts.commit) {
	if (opts.one) {
		commitToGit(files);
	} else {
		commitAllToGit(files);
	}
}