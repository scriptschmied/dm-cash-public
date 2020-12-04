const https = require('https');
const Compute = require('../../node_modules/@google-cloud/compute');
const os = require("os");
exports.kill = function(){
const compute = new Compute({keyFilename : '/home/brandonburke_personal/dm-cash/local-modules/utilities/key.json',
projectId : "gifted-airport-243821"});
const zone = compute.zone('us-east1-b');
const ig = zone.instanceGroup('instance-group-1');
let t = os.hostname();
let currentVM
ig.getVMs(function(err, vms){
	for (let vm of vms){
		if (vm.name === t){
		  currentVM = vm;
		  return
		}
		vm.stop();
	}
	currentVM.stop()
})
}
