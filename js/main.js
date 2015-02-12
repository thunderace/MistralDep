global.$ = $;

var path = require('path');
var shell = require('nw.gui').Shell;
var fs = require('fs');
var ini = require('./js/ini.js');
var netview = require('./js/netview.js');
var exec = require('child_process').exec;
var mistralVersionList = [];

var mistralDir = "c:\\Mistral";
var hostList = [];
var remoteFile = path.resolve('./config/Mistral-Remote.txt');
var startFile = path.resolve('./config/Mistral-Start.txt');
var killFile = path.resolve('./config/Mistral-Kill.txt');
var iniFile = path.resolve('./config/Mistral.ini');
var psExec  = path.resolve('./bin/psexec.exe');
var psKill  = path.resolve('./bin/pskill.exe');

var config = ini.parse(fs.readFileSync(iniFile, 'utf-8'));

var versionConfig = null;
psExec += ' -p ' + config.credentials.password + ' -u ' + config.credentials.user;
//psKill += ' -p ' + config.credentials.password + ' -u ' + config.credentials.user;

function iniSave() {
	fs.writeFileSync(iniFile, ini.stringify(config));
}

netview.view(function(hosts) {
	hostList = hosts;
});


function stopSerHor(host) {
	var command = 'sc \\\\' + host + ' start ServiceHeureSNIM'
    exec(command,function(err,stdout,stderr){
		console.log(err);
		console.log(stdout);
		console.log(stderr);
	});
}

function startSerHor(host) {
	var command = 'sc \\\\' + host + ' stop ServiceHeureSNIM'
    exec(command,function(err,stdout,stderr){
		console.log(err);
		console.log(stdout);
		console.log(stderr);
	});
}


function stopPOs() {
	console.log('stopPOs');
	var pos = config.po.hosts.split(',');
	var processes = config.po.processes.split(',');
	pos.forEach(function(po) {
		processes.forEach(function(process) {
			if (process) { // not really needed but...
				var commandLine = psKill + ' -p ' + config.po.password + ' -u ' + config.po.user + ' \\\\' + po + ' ' + process;
				exec(commandLine,function(err,stdout,stderr){
					if (err) {
						console.log(err);
					}
				});
			}
		});
	});
}
function stopAll() {
	var processes = config.config.processes.split(',');
	var remotes = config.config.hosts.split(',');
	remotes.forEach(function(remote) {
		processes.forEach(function(process) {
			if (process) {
				var commandLine = psKill + ' \\\\' + remote + ' ' + process;
				exec(commandLine,function(err,stdout,stderr){
					if (err) {
						console.log(err);
					}
				});
			}
		});
	});
	if (config.config.serHor == 1) {
		remotes.forEach(function(remote) {
			stopSerHor(remote);
		});
	}
}

function start() {
	// TODO : load version ini file
	var currentVersion = getCurrentActiveVersion();
	if (currentVersion == null) {
		console.log('no current version');
		return;
	}
	var versionconfig = ini.parse(fs.readFileSync(path.resolve('./config/' + getCurrentActiveVersion() + '.ini'), 'utf-8'));
	var processes = versionconfig.config.processes.split(',');
	var remotes = versionconfig.config.hosts.split(',');
	remotes.forEach(function(remote) {
		processes.forEach(function(process) {
			if (process) {
				var commandLine = psExec + ' \\\\' + remote +  ' -d -i ' + path;
				exec(commandLine,function(err,stdout,stderr){
					if (err) {
						console.log(err);
					}
				});
			}
		});
	});
	if (versionconfig.config.serHor == 1) {
		remotes.forEach(function(remote) {
			startSerHor(remote);
		});
	}
}

function getCurrentActiveVersion() {
	// detect current version
	try {
		var stat = fs.lstatSync(mistralDir);
		console.log(stat);
		if (stat.isSymbolicLink()) {
			var realPath = fs.realpathSync(mistralDir);
			console.log(realPath);
			// split real path and keep the last part
			var splitPath = realPath.split('\\');
			$('#currentVersion').attr('placeholder',splitPath[splitPath.length - 1]);
			return splitPath[splitPath.length - 1];
		}
	} catch(ex) {
		console.log('No Active Version');
	}
	return null;
}

function mklink(version) {
	var commandLine = psExec + ' @' + remoteFile + ' cmd /c rmdir ' + mistralDir;
    exec(commandLine,function(err,stdout,stderr){
		if (err) {
//			return;
		}
		console.log(stdout);
		console.log(err);
		console.log(stderr);
		commandLine = psExec + ' @' + remoteFile + ' cmd /c mklink /D ' + mistralDir + ' \"' + path.join(config.paths.mistralversiondir, version) + '\"';
		console.log(commandLine);
		exec(commandLine,function(err,stdout,stderr){
			check(0);
			if (err) {
				window.alert('Impossible d\'activer la version ' + version + '. Contactez le support (Guillaume).');
				return;
			}
			$('#currentVersion').attr('placeholder',version);
			console.log(stdout);
			console.log(err);
			console.log(stderr);
		});
	});
	
	// do on local 
	commandLine =  'cmd /c rmdir ' + mistralDir;
    exec(commandLine,function(err,stdout,stderr){
		if (err) {
//			return;
		}
		console.log(stdout);
		console.log(err);
		console.log(stderr);
		commandLine = 'cmd /c mklink /D ' + mistralDir + ' \"' + path.join(config.paths.mistralversiondir, version) + '\"';
		console.log(commandLine);
		exec(commandLine,function(err,stdout,stderr){
			if (err) {
				return;
			}
			$('#currentVersion').attr('placeholder',version);
			console.log(stdout);
			console.log(err);
			console.log(stderr);
		});
	});
}

function disableAll(disable) {
	$('#start').attr('disabled', disable);
	$('#restart').attr('disabled', disable);
	$('#stop').attr('disabled', disable);
	$('#changeVersion').attr('disabled', disable);
	$('#changeVersionDropDown').attr('disabled', disable);
	$('#createVersion').attr('disabled', disable);
	$('#configureVersion').attr('disabled', disable);
}

function checkSVGFolder() {
	rootPath = config.paths.mistralversiondir; 
	return fs.existsSync(rootPath);
}

function readAvailableMistralVersions() {
	rootPath = config.paths.mistralversiondir; 
	// check dir exists
	var files = [];
	try {
		files = fs.readdirSync(rootPath);
	} catch(ex) {
		window.alert(rootPath + 'n\'existe pas. Vérifier la configuration.');
	}
	$('#versionList').html('');  // empty list
	versionCount = files.length;
	files.forEach(function(file) {
		if (file != 'tools') { // ignore tools dir
			console.log(path.join(rootPath, file));
			var stat = fs.statSync(path.join(rootPath, file));
			if (stat && stat.isDirectory()) {	
				mistralVersionList.push(file);
				$('#versionList').prepend('<li><a href=\"#\" id="' + file + '">' + file +'</a></li>');
			}
		}
	});
}

var rootPath;
var versionCount = 0;

function init() {
    $(document).delegate('#start', 'click', function(event) {  
//		window.alert('TODO : stop - check mistral installation - start Mistral');
		start();
    });
    $(document).delegate('#stop', 'click', function(event) {  
		stopAll();
    });
    $(document).delegate('#restart', 'click', function(event) {  
		window.alert('TODO : remove this one');
    });
    $(document).delegate('#versionList', 'click', function(event) {  
		window.alert('TODO :\ntry to stop current Mistral version');
		mklink(event.target.id);
    });
	
	
    $(document).delegate('#createVersion', 'click', function(event) {  
		bootbox.prompt('Nom de la nouvelle version?', function(file) {                
			if (file === null) {                                             
			} else {
			// create directory
			fs.mkdirSync(path.join(rootPath, file));
			readAvailableMistralVersions();
			mklink(file);
			window.alert('Vous pouvez maintenant installer la version ' + file);
			}
		});
	});
	
    $(document).delegate('#configureVersion', 'click', function(event) {
		bootbox.dialog(
			{
				title: 'Configuration des répertoires.',
				message: '<div class="row">  ' +
					'<div class="col-md-12"> ' +
					'<form class="form-horizontal"> ' +
					'<div class="form-group"> ' +
					'<label class="col-md-6" for="mistralrep">Répertoire des versions Mistral</label> ' +
					'<div class="col-md-6"> ' +
					'<input id="mistralrep" name="mistralrep" type="text" placeholder="c:\\Mistral.store" class="form-control input-md" value="' + rootPath + '"> ' +
					'</div> ' +
					'</div> ' +
					'</form> </div>  </div>',
				buttons: {
					success: {
						label: 'Save',
						className: 'btn-success',
						callback: function () {
							config.paths.mistralversiondir = $('#mistralrep').val();
							iniSave();
							// console.log(config.paths.mistralversiondir);
							try {
								fs.mkdirSync(config.paths.mistralversiondir);
							} catch(ex) {
							}
							readAvailableMistralVersions();
						}
					},
					cancel: {
						label: 'Annuler',
						className: 'btn-cancel',
						callback: function () {
						}
					}
				}
			}
		);
	});		
	
    $(document).delegate('#pathconfiguration', 'click', function(event) {
		bootbox.dialog({
				title: 'Configuration des répertoires.',
				message: '<div class="row">  ' +
					'<div class="col-md-12"> ' +
					'<form class="form-horizontal"> ' +
					'<div class="form-group"> ' +
					'<label class="col-md-6" for="mistralrep">Répertoire des versions Mistral</label> ' +
					'<div class="col-md-6"> ' +
					'<input id="mistralrep" name="mistralrep" type="text" placeholder="c:\\Mistral.store" class="form-control input-md" value="' + rootPath + '"> ' +
					'</div> ' +
					'</div> ' +
					'</form> </div>  </div>',
				buttons: {
					success: {
						label: 'Save',
						className: 'btn-success',
						callback: function () {
							config.paths.mistralversiondir = $('#mistralrep').val();
							iniSave();
							// console.log(config.paths.mistralversiondir);
							try {
								fs.mkdirSync(config.paths.mistralversiondir);
							} catch(ex) {
							}
							check(0);
						}
					},
					cancel: {
						label: 'Annuler',
						className: 'btn-cancel',
						callback: function () {
						}
					}
				}
			}
		);
	});	
}

function check(level) {
	// level 0 : call on svg path change
	// level 1 : I don't know :)

	disableAll(true);
	if (level == 0) {
		if (checkSVGFolder() == false) {
			// the svg folder doesn't exists : enable the button to fix this
			$('#pathconfiguration').attr('disabled', false);
			return;
		}
		readAvailableMistralVersions();
		$('#pathconfiguration').attr('disabled', false);
		$('#createVersion').attr('disabled', false);
		if (versionCount != 0) {
			// enable : version-select, createversion, path configuration
			$('#changeVersion').attr('disabled', false);
			$('#changeVersionDropDown').attr('disabled', false);
		} else {
			return;
		}
	}
	if (level <= 1) {
		var currentVersionName;
		if ((currentVersionName = getCurrentActiveVersion()) != null) {
			// active version exists : enable start/restart/stop/configureVersion buttons
			$('#start').attr('disabled', false);
			$('#restart').attr('disabled', false);
			$('#stop').attr('disabled', false);
			$('#configureVersion').attr('disabled', false);
			console.log('load version configuration file');
			var versionFile = path.resolve('./config/' + currentVersionName + '.ini');
			versionConfig = ini.parse(fs.readFileSync(versionFile, 'utf-8'));
		}
	}
}


$(document).ready(function() {
	init();
	check(0);
});
