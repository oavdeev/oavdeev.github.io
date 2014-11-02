function Timeline(events) {
  this.events = events;
}

Timeline.prototype.push = function(e) {
    this.events.push(e);
}

Timeline.prototype.getByTag = function(tag) {
    for (i in this.events) {
        if (this.events[i].tag == tag)
            return this.events[i];
    }
};

Timeline.prototype.getByTagAndJobId = function(tag, jobid) {
    for (i in this.events) {
        if (this.events[i].tag == tag && this.events[i].jobid == jobid)
            return this.events[i];
    }
};

Timeline.prototype.getFirstTimestamp = function() {
    return this.events[0].timestamp;
};

Timeline.prototype.getLastTimestamp = function() {
    return this.events[this.events.length-1].timestamp;
};

var QUERIES = [
    { queryid : "q-1234", events : new Timeline([
                                                 {tag: 'query.begin', timestamp: 1409947031},
                                                 {tag: 'job.started',  jobid: 'job-12314', timestamp: 1409947051},
                                                 {tag: 'job.started',  jobid: 'job-12315', timestamp: 1409947055},
                                                 {tag: 'job.finished',  jobid: 'job-12314', timestamp: 1409947061},
                                                 {tag: 'job.finished',  jobid: 'job-12315', timestamp: 1409947071}
                                                 ])
    },
    { queryid : "q-1235", events : new Timeline([{tag: 'query.begin', timestamp: 1409948031}])}
];


var QUERY_STAGES = {
    "q-1234" : [
        {
         filetype : "matrix",
         file_set : ["adcube-2014-08-01", "adcube-2014-08-02", "adcube-2014-08-03", "adcube-2014-08-04"],
         query : "uniq whatever over whatever",
         nworkers : 12
        },
        {
         filetype : "sum",
         file_set : [],
         query : "uniq whatever over whatever",
         nworkers : 12
        }
    ]
};

var FILE_SIZES = {
    "adcube-2014-08-01" : { matrix: 120000000},
    "adcube-2014-08-02" : { matrix: 280000000},
    "adcube-2014-08-03" : { matrix: 350000000},
    "adcube-2014-08-04" : { matrix: 590000000}
};

var QUERY_SLOTS = {
    "q-1234" : {"localhost/0" : "job-12314", "localhost/1": "job-12315", "localhost/2" : "job-12316"}
};


var QUERY_JOBS = {
    "q-1234" : [
        {
            jobid : "job-12314",
            queryid : "q-1234",
            resources : ["adcube-2014-08-01", "adcube-2014-08-02"],
            query: "uniq whatever over whatever",
            filetype: "matrix",
            fixed_cost : null
        },
        {
            jobid : "job-12315",
            queryid : "q-1234",
            resources : ["adcube-2014-08-03", "adcube-2014-08-04"],
            query: "uniq whatever over whatever",
            filetype: "matrix",
            fixed_cost : null
        },
        {
            jobid : "job-12316",
            queryid : "q-1234",
            resources : [],
            query: "uniq whatever over whatever",
            filetype: "sum",
            fixed_cost : 1
        }
    ]
}


function DelirollAPI() {

}

DelirollAPI.prototype.getQueriesLog = function (cb) {
  d3.json("/log/query/", function(error, json) {
        if (error) return console.warn(error);
        var queries = {};
        for (i in json) {
            var qid = json[i].queryid
            if (!(qid in queries)) {
                queries[qid] = {events : new Timeline([]), queryid : qid};
            }
            queries[qid].events.push(json[i]);
        }
        cb(error, queries);
  });
}

DelirollAPI.prototype.getFileSizes = function(queryid, cb) {
    d3.json("/status/files/sizes/", function(error, json) {
        cb(null, FILE_SIZES);
    });
}

DelirollAPI.prototype.getQuerySlots = function(queryid, cb) {
    d3.json("/log/query/" + queryid + "/schedule/", function(error, json) {
        cb(error, json);
    });
}

DelirollAPI.prototype.getQueryFullTrace = function(queryid, cb) {
    d3.json("/log/query/" + queryid + "/fulltrace/", function(error, json) {
        cb(error, new Timeline(json));
    });
}

DelirollAPI.prototype.getJobFullTrace = function(jobid, cb) {
    d3.json("/log/job/" + jobid + "/fulltrace/", function(error, json) {
        cb(error, new Timeline(json));
    });
}

DelirollAPI.prototype.getQueryJobs = function(queryid, cb) {
  d3.json("/log/query/" + queryid + "/jobs/", function(error, json) {
        if (error) return console.warn(error);
        var res = {};
        for (i in json) {
            res[json[i].jobid] = json[i];
        }
        cb(error, res);
  });
}


DelirollAPI.prototype.getServers = function(cb) {
    d3.json("/status/servers/", function(error, json) {
        cb(error, json);
    });
}

DelirollAPI.prototype.getSlots = function(cb) {
    d3.json("/status/slots/short/", function(error, json) {
        cb(error, json);
    });
}

DelirollAPI.prototype.getSlotsWithDataMaps = function(cb) {
    d3.json("/status/slots/full/", function(error, json) {
        cb(error, json);
    });
}

DelirollAPI.prototype.getBaseDataMap = function(cb) {
    d3.json("/status/files/basemap/", function(error, json) {
        cb(error, json);
    });
}

/* returns dictionary of cube objects
    {
        "cube1" : {
           name: "cube1",
           days: {
                "2014-09-01" : ["slot/1", "slot/2"]
           }
        }
    }
*/

function getDataCubesFromSlots(data, type) {
    var res = {};
    for (slotName in data) {
        for (filetype in data[slotName].data_map) {
            console.log(type, filetype);
            if (type != undefined && filetype != type)
                continue;
            for (k in data[slotName].data_map[filetype]) {
                var folder_name = k.split("/")[0];
                var parts = /([^-]+)-(\d{4}-\d{2}-\d{2})-([^-]+)/.exec(folder_name);
                var cube = parts[1];
                var date = parts[2];
                if (!(cube in res)) res[cube] = { name: cube, days : {} };
                if (!(date in res[cube].days)) res[cube].days[date] = [];
                res[cube].days[date].push(slotName);
            }
        }
    }
    return res;
}