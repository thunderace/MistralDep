var exec = require('child_process').exec;

module.exports = {
view: function(callback){
    exec('net view',function(err,stdout,stderr){
		var p = stdout.split('\r\n');
		var proc = [];
		while (p.length > 1) {
			var rec = p.shift();
			if (rec[0] == "\\" && rec[1] == "\\") {
				// cut at the first space
				var host = rec.split(' ');
				proc.push(host[0]);
			}
		}
		if (callback) {
			callback(proc);
		}
    });
  }
 };
  