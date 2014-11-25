'use strict';

var fs = require('fs');
var cp = require('child_process');

function random(a, b) {
	return isNaN(b) ? 
		Math.floor(Math.random() * a) :
		(a + Math.floor(Math.random() * (b -a)));
}

function timestamp() {
	return (new Date()).toISOString().replace(/\D/g,'').substring(0, 14);
}

function generateRandomChanges(count, filenamebase, extension) {
	var index = 1, result = [], filename, data, commitMsg;
	while (index<=count) {
		filename = filenamebase + index + '.' + extension;
		data = 'var counter=' + random(1000, 10000) + ';';		

		fs.writeFileSync(filename, data);
		result.push({file: filename, data: data});
		index++;
	}

	return result;
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
		var gitAdd;
		
		gitAdd = cp.exec(('git add ' + filename), 
			function(err, stdout) {
				var gitCommit;

				if (!err) {
					console.log(stdout);
				} else {
					console.error(err);
				}
				gitAdd.stdin.end();
				
				gitCommit = cp.exec(('git commit -m "A random change of to ' + filename +'" "' + filename +'"'), function(err, stdout){
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
	.option('number', {
		position: 0,
		default: 3,
		help: 'The number of files to generate'
	})
	.option('filename', {
		position: 1,
		help: 'The filename prefix'
	})
	.option('commit', {
		abbr: 'c',
		flag: true,
		help: 'Commit files as individual snapshots'
	})
	.option('all', {
		abbr: 'a',
		flag: true,
		help: 'Commit all files as one snapshot'
	});

var opts = optionConfig.parse();
var files;

if (!opts.filename || isNaN(opts.number)) {
	console.error(optionConfig.getUsage());
	return 1;
}

if (opts.number <= 0) {
	console.error(optionConfig.getUsage());
	return 1;
}

files = generateRandomChanges(opts.number, opts.filename, 'js');

if (opts.commit) {
	if (opts.all) {
		commitAllToGit(files);
	} else {
		commitToGit(files);
	}
}