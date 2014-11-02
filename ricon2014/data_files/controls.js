/** @jsx React.DOM */

var QueryLoadDistribution = React.createClass({
    render: function() {
        var s = {stroke: "black", fill: "none"};
        return <svg width={this.props.width} height={this.props.height}>
        <defs>
        <pattern id="texture_diagonal" x="0" y="0" width="2%" height="5%" patternUnits="userSpaceOnUse">
            <path d="M 0 0 l 32 32" style={s}/>
        </pattern>
        <pattern id="cross"  patternUnits="userSpaceOnUse" width="2%" height="5%" >
            <path d='M0 0L8 8ZM8 0L0 8Z' stroke-width='1' stroke='#1e292d'/>
        </pattern>
        </defs>
        </svg>;
    },

    getInitialState : function () {
        this.init();
        return {};
    },

    init : function () {
        var query = this.props.query;
        var t = this;

        this.props.api.getQuerySlots(query.queryid, function(e, r) { t.setState({slots:r}); t.renderD3(); });
        this.props.api.getQueryJobs(query.queryid, function(e, r) { t.setState({jobs:r}); t.renderD3(); });
        this.props.api.getFileSizes(query.queryid, function(e, r) { t.setState({file_sizes:r}); t.renderD3(); });
    },

    renderD3: function () {
        var query = this.props.query;

        if (!this.state.slots || !this.state.file_sizes || !this.state.jobs) {
            console.log("Not enough state to render: ", this.state)
            return;
        } else {
            console.log("rendering")
        }

        var query_jobs = this.state.jobs;
        var query_slots = this.state.slots;
        var file_sizes = this.state.file_sizes;

        var bottomMargin = 20;
        var topMargin = 15;
        var leftMargin = 95;
        var rightMargin = 4;
        var slotNames = Object.keys(query_slots).sort();


        var plot_height = this.props.height - (topMargin + bottomMargin);
        var plot_width = this.props.width - (leftMargin + rightMargin);

        var maxSlotDataSize = 0;
        var data_array = slotNames.map(function(n) {
                var jobid = query_slots[n];
                var job = query_jobs[jobid];
                var x0 = 0;

                files = job.resources.map(function(f) {
                        var size = file_sizes[f] ? file_sizes[f][job.filetype] : 1000000000;
                        maxSlotDataSize = Math.max(x0 + size, maxSlotDataSize);
                        res = {
                                    "size" : size,
                                    "x0" : x0,
                                    "x1" : x0 + size,
                                    "filename" : f,
                                    "slot" : n,
                                    "filetype" : job.filetype
                               };
                        x0 += size;
                        return res;
                        });
                return {
                            "name" : n,
                            "files" : files,
                            "filetype" : job.filetype
                       };
            });

        /* add a dummy 'file' for reduce jobs */
        var num_reduce_jobs = Object.keys(query_jobs).reduce(function (s, j) { return query_jobs[j].filetype == "sum" ? s+1 : s; }, 0);

        if (num_reduce_jobs > 0) {
            reduce_size = maxSlotDataSize / num_reduce_jobs;
            for (i in data_array) {
                if (data_array[i].files.length == 0 && data_array[i].filetype == "sum") {
                    data_array[i].files.push({filename:null, filetype:data_array[i].filetype,
                                              x0: 0, x1: reduce_size, size: reduce_size});
                }
            }
        }

        var y = d3.scale.ordinal()
            .domain(slotNames)
            .rangeBands([0, plot_height]);

        var x = d3.scale.linear()
            .domain([0, maxSlotDataSize])
            .range([0, plot_width]);

        var svg = d3.select(this.getDOMNode());
        var plot = svg.append("g").attr("transform", "translate(" + leftMargin + "," + topMargin +")");

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .tickFormat(function(x, i) {
                if (i == 0 || slotNames[i].split("/")[0] != slotNames[i-1].split("/")[0])
                    return shortSlotName(x);
                else
                    return x.split("/")[1];
            });

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickFormat(bytesToString);

        plot.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + (plot_height) + ")")
          .call(xAxis);

        plot.append("g")
          .attr("class", "y axis")
          .call(yAxis);

        var slot = plot.selectAll(".slot")
              .data(data_array)
            .enter().append("g")
              .attr("class", "slot")
              .attr("transform", function(d) { return "translate(0, " + y(d.name) + ")"; });

        var tip = d3.tip()
          .attr('class', 'd3-tip')
          .offset([-10, 0])
          .html(function(d) {
            if (d.filetype == "sum") {
                return "<strong>Type: </strong>sum</br>";
            } else
            return "<strong>Filename:</strong> <span>" + (d.filename ? d.filename : "N/A") + "</span>" + "<br/><strong>Size:</strong> " + bytesToString(d.size) + "<br/><strong>Type:</strong> " + d.filetype
                + "<br/><strong>Slot:</strong> " + d.slot;

        });
        svg.call(tip);

        slot.selectAll("rect")
              .data(function(d) { return d.files; })
            .enter().append("rect")
              .classed("file", true)
              .classed("sum", function (d) { return d.filetype == "sum"; })
              .attr("height", y.rangeBand())
              .attr("x", function(d) { return x(d.x0); })
              .attr("width", function(d) { return x(d.x1) - x(d.x0); })
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);
    },

    componentDidMount: function () {
        this.renderD3();

    },

    shouldComponentUpdate: function(props) {
        this.renderD3();
        // always skip React's render step
        return false;
    }
});

var QueryTimeline = React.createClass({
    render: function() {
        return <svg width={this.props.width} height={this.props.height}>
                <pattern id='bluestripe' patternUnits='userSpaceOnUse' x='0' y='0' width='20' height='20' viewBox='0 0 40 40' >
                    <rect width='110%' height='110%' fill='#ffffff'/>
                        <path d='M1,1h40v40h-40v-40' fill-opacity='0' stroke-width='1' stroke-dasharray='0,1,1' stroke='#cccccc'/>
                </pattern>
        </svg>;
    },

    getInitialState : function () {
        this.init();
        return {};
    },

    init : function () {
        var queryid = this.props.queryid;
        var t = this;

        this.props.api.getQueryFullTrace(queryid, function(e, r) { t.setState({trace:r}); t.renderD3(); });
        this.props.api.getQuerySlots(queryid, function(e, r) { t.setState({slots:r}); t.renderD3(); });
        this.props.api.getQueryJobs(queryid, function(e, r) { t.setState({jobs:r}); t.renderD3(); });

    },

    renderD3: function () {

        if (!this.state.slots || !this.state.jobs || !this.state.trace) {
            console.log("Not enough state to render")
            return;
        } else {
            console.log(this.state);
        }

        var query_slots = this.state.slots;
        var jobid_to_slot = {}; for (i in query_slots) { jobid_to_slot[query_slots[i]] = i; }
        var query_jobs = this.state.jobs;
        var query_trace = this.state.trace;

        var bottomMargin = 20;
        var topMargin = 15;
        var leftMargin = 15;
        var rightMargin = 4;
        var plot_width = this.props.width - (leftMargin + rightMargin);
        var plot_height = this.props.height - (topMargin + bottomMargin);


        var timeBegin = query_trace.getFirstTimestamp();
        var timeEnd = query_trace.getLastTimestamp();
        var finish = query_trace.getByTag("query.finished");

        if (!finish) {
            timeEnd += (timeEnd == timeBegin) ? 10000 : (timeEnd - timeBegin)/4;
        }

        var x = d3.time.scale()
                        .domain([new Date(timeBegin), new Date(timeEnd)])
                        .range([0, plot_width]);

        var svg = d3.select(this.getDOMNode());

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");


        /* data should be array of slots, each slot having a list of jobs, each job having start and end time (optionally). Currently there's only one job per slot per query though. */
        var data_array = [];
        var slot_names = Object.keys(query_slots).sort();
        for (i in slot_names) {
            var slot = slot_names[i];
            var jobid = query_slots[slot];
            var job = query_jobs[jobid];
            var jobStart = query_trace.getByTagAndJobId("job.started", jobid);
            var jobEnd   = query_trace.getByTagAndJobId("job.finished", jobid);
            console.log(jobStart, jobid);
            if (!jobStart)
                continue; /* job hasn't even started yet, skip */
            job.startTime = jobStart.timestamp;
            job.endTime = jobEnd ? jobEnd.timestamp : null;

            data_array.push({"name" : slot, jobs : [job]})
        }

        var plot = svg.append("g").attr("transform", "translate(" + leftMargin + "," + topMargin +")");
        var slot_height = (plot_height) / data_array.length;

        plot.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (plot_height) + ")")
            .call(xAxis)
          .selectAll("text")
            .attr("y", 6)
            .attr("x", 6)
            .style("text-anchor", "start");

        var slot = plot.selectAll("g.slot")
            .data(data_array, function(d) { return d.name; });

        var slot_g = slot.enter().append("g")
                     .attr("class", "slot")
                     .attr("transform", function(d, i) { return "translate(0,"
                                                   + i * (slot_height)+ ")"; })

        var job = slot.selectAll("g.job")
            .data(function(d) { return d.jobs },
                  function (j) { return j.jobid; });
        var job_g = job.enter().append("g")
            .attr("class", "job")
            .attr("transform", function(job, i) { return  "translate(" + x(job.startTime) + ",0)"; });

        var tip = d3.tip()
          .attr('class', 'd3-tip')
          .offset([-10, 0])
          .html(function(d) {
            return "<strong>Job ID:</strong> <span>" + d.jobid + "</span>" + "<br/><strong>Start:</strong> " + formatTime(new Date(d.startTime)) + "<br/><strong>End:</strong> " + formatTime(new Date(d.endTime))
                + "<br/><strong>Slot:</strong> " + jobid_to_slot[d.jobid];
        });

        svg.call(tip);


        job_g.append("rect")
            .attr("width", function (job) { if (job.endTime) { return x(job.endTime) - x(job.startTime);}
                                                        else { return x(timeEnd) - x(job.startTime);}
                                          })
            .attr("height", slot_height)
            .attr("class", "job")
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);


    },

    componentDidMount: function () {
        this.renderD3();
    },

    shouldComponentUpdate: function(props) {
        this.renderD3();
        // always skip React's render step
        return false;
    }
});


var JobTimeline = React.createClass({
    render: function() {
        return <svg width={this.props.width} height={this.props.height}>
                <pattern id='bluestripe' patternUnits='userSpaceOnUse' x='0' y='0' width='20' height='20' viewBox='0 0 40 40' >
                    <rect width='110%' height='110%' fill='#ffffff'/>
                        <path d='M1,1h40v40h-40v-40' fill-opacity='0' stroke-width='1' stroke-dasharray='0,1,1' stroke='#cccccc'/>
                </pattern>
        </svg>;
    },

    getInitialState : function () {
        this.init();
        return {};
    },

    init : function () {
        var jobid = this.props.jobid;
        var t = this;

        this.props.api.getJobFullTrace(jobid, function(e, r) { t.setState({trace:r}); t.renderD3(); });

    },

    renderD3: function () {

        if (!this.state.trace) {
            console.log("Not enough state to render")
            return;
        } else {
            console.log(this.state);
        }

        var job_trace = this.state.trace;

        var bottomMargin = 20;
        var topMargin = 15;
        var leftMargin = 15;
        var rightMargin = 4;
        var plot_width = this.props.width - (leftMargin + rightMargin);
        var plot_height = this.props.height - (topMargin + bottomMargin);


        var timeBegin = job_trace.getFirstTimestamp();
        var timeEnd = job_trace.getLastTimestamp();
        var finish = job_trace.getByTag("job.finished");

        if (!finish) {
            timeEnd += (timeEnd == timeBegin) ? 10000 : (timeEnd - timeBegin)/4;
        }

        var x = d3.time.scale()
                        .domain([new Date(timeBegin), new Date(timeEnd)])
                        .range([0, plot_width]);

        var svg = d3.select(this.getDOMNode());

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        var plot = svg.append("g").attr("transform", "translate(" + leftMargin + "," + topMargin +")");

        var ev = plot.selectAll("g.event")
            .data(job_trace.events);

        ev.enter().append("g")
            .attr("class", "event")
            .attr("transform", function(d) { return "translate(" + x(d.timestamp) + ",0)"})
            .append("line")
            .attr("y1", 0)
            .attr("y2", plot_height);

        plot.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (plot_height) + ")")
            .call(xAxis)
          .selectAll("text")
            .attr("y", 6)
            .attr("x", 6)
            .style("text-anchor", "start");

    },

    componentDidMount: function () {
        this.renderD3();
    },

    shouldComponentUpdate: function(props) {
        this.renderD3();
        // always skip React's render step
        return false;
    }
});


var CubeDataTimeline = React.createClass({
    render: function() {
        return <svg width={this.props.width} height={this.props.height}>
        </svg>;
    },

    getInitialState : function () {
        this.init();
        return {};
    },

    init : function () {
    },

    renderD3: function () {

        var cube = this.props.cube;

        var margins = { bottom: 20, top: 15, left: 15, right: 4};
        var plot_width = this.props.width - (margins.left + margins.right);
        var plot_height = this.props.height - (margins.top + margins.bottom);

        var svg = d3.select(this.getDOMNode());
        var plot = svg.append("g").attr("transform", "translate(" + margins.left + "," + margins.top +")");


        var x = d3.time.scale()
                        .domain([this.props.timeBegin, this.props.timeEnd])
                        .range([0, plot_width]);


        var ticks = days_between(this.props.timeBegin, this.props.timeEnd);


        var xAxis = d3.svg.axis()
            .scale(x)
            .tickFormat(d3.time.format("%m-%d"))
            .tickValues(ticks.filter(function (d,i){ return 0 == i % Math.ceil(ticks.length / 10)}))
            .orient("bottom");

        var days = days_between(this.props.timeBegin, this.props.timeEnd).map(function(d) {
            return {
                     date : d,
                     data : cube.days[formatYYYYMMDD(d)] ? cube.days[formatYYYYMMDD(d)] : []
                   }
        });

        /* create mouseover tip */
        var tip = d3.tip()
          .attr('class', 'd3-tip')
          .offset([-10, 0])
          .html(function(d) {
            return "<strong>" + formatYYYYMMDD(d.date) + "</strong><br/>Slots: " + d3.set(d.data).values().length;
        });

        svg.call(tip);

        /* create actual plot */
        var day_g = plot.selectAll("g.day")
                  .data(days);

        var rectW = x(this.props.timeEnd) - x(this.props.timeEnd - 24*3600000);
        var rectH = rectW < plot_height ? rectW : plot_height;

        day_g.enter().append("g")
            .attr("class", "day")
            .attr("transform", function(d) { return "translate(" + x(d.date) + ", " + (plot_height - rectH) + ")"})
            .append("rect")
            .attr("class", "day")
            .attr("width", rectW)
            .attr("height", rectH)
            .style("fill", function (d) {
                 var slots = d3.set(d.data).values();
                 if (slots.length == 0)
                     return "#FFFFFF";
                 else if (slots.length == 1)
                     return "rgb(226, 128, 21)";
                 else
                     return "rgb(38, 201, 79)";
            })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

        /* x axis */
        plot.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (plot_height) + ")")
            .call(xAxis)
          .selectAll("text")
            .attr("y", 6)
            .attr("x", 6)
            .style("text-anchor", "start");

    },

    componentDidMount: function () {
        this.renderD3();
    },

    shouldComponentUpdate: function(props) {
        //this.renderD3();
        // always skip React's render step
        return false;
    }
});


var CubeDataExtendedTimeline = React.createClass({
    render: function() {
        return <svg width={this.props.width} height={this.props.height}>
        </svg>;
    },

    getInitialState : function () {
        this.init();
        return {};
    },

    init : function () {
    },

    renderD3: function () {
        var cube = this.props.cube;

        var margins = { bottom: 20, top: 15, left: 15, right: 4};
        var plot_width = this.props.width - (margins.left + margins.right);
        var plot_height = this.props.height - (margins.top + margins.bottom);

        var svg = d3.select(this.getDOMNode());
        svg.selectAll("*").remove();

        var plot = svg.append("g").attr("transform", "translate(" + margins.left + "," + margins.top +")");


        var x = d3.time.scale()
                        .domain([this.props.timeBegin, this.props.timeEnd])
                        .range([0, plot_width]);


        var ticks = days_between(this.props.timeBegin, this.props.timeEnd);


        var xAxis = d3.svg.axis()
            .scale(x)
            .tickFormat(d3.time.format("%m-%d"))
            .tickValues(ticks.filter(function (d,i){ return 0 == i % Math.ceil(ticks.length / 10)}))
            .orient("bottom");

        var server_set = d3.set();
        var days = days_between(this.props.timeBegin, this.props.timeEnd).map(function(d) {
            var servers = d3.set((cube.days[formatYYYYMMDD(d)] ? cube.days[formatYYYYMMDD(d)] : []).map(function(x){
                         var serverName = x.split("/")[0];
                         server_set.add(serverName);
                         return serverName;
                     })).values();
            servers.date = formatYYYYMMDD(d);
            return {
                     date : d,
                     data : servers
                   }
        });

        var servers = server_set.values(); servers.sort();

        var y = d3.scale.ordinal()
                    .domain(servers)
                    .rangeBands([0, plot_height]);

        /* create mouseover tip */
        var tip = d3.tip()
          .attr('class', 'd3-tip')
          .offset([-10, 0])
          .html(function(d) {
            return formatYYYYMMDD(d.date);
        });

        svg.call(tip);

        /* create actual plot */
        var day_g = plot.selectAll("g.day")
                  .data(days);

        var rectW = x(this.props.timeEnd) - x(this.props.timeEnd - 24*3600000);
        var rectH = rectW < plot_height ? rectW : plot_height;

        var rect = day_g.enter().append("g")
            .attr("class", "day")
            .attr("transform", function(d) { return "translate(" + x(d.date) + ", " + (plot_height - rectH) + ")"})
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide)
            .selectAll("rect").data(function(d) { return d.data; })

        rect.enter().append("rect")
            .attr("class", "day")
            .attr("width", rectW)
            .attr("height", rectH)
            .attr("transform", function(d) { return "translate(0, " + (-y(d)) + ")"})
            .style("fill", function (d) {
                 if (d == "S3")
                     return "rgb(226, 128, 21)";
                 else
                     return "rgb(38, 201, 79)";
            });

        /* x axis */
        plot.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (plot_height) + ")")
            .call(xAxis)
          .selectAll("text")
            .attr("y", 6)
            .attr("x", 6)
            .style("text-anchor", "start");

    },

    componentDidMount: function () {
        this.renderD3();
    },
    componentDidUpdate: function(props) {
        console.log("componentDidUpdate", props.cube)
        this.renderD3();
    }
});
