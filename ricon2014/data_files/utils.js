var formatTime = d3.time.format("%Y-%m-%d %H:%M:%S");
var formatYYYYMMDD = d3.time.format("%Y-%m-%d");

var bytesToString = function (bytes) {
    // One way to write it, not the prettiest way to write it.

    var fmt = d3.format('.0f');
    if (bytes < 1024) {
        return fmt(bytes) + 'B';
    } else if (bytes < 1024 * 1024) {
        return fmt(bytes / 1024) + 'kB';
    } else if (bytes < 1024 * 1024 * 1024) {
        return fmt(bytes / 1024 / 1024) + 'MB';
    } else {
        return fmt(bytes / 1024 / 1024 / 1024) + 'GB';
    }
}

function shortSlotName(x) {
    return x.replace(".us-west-2.compute.amazonaws.com", "").replace("ec2-", "");
}

/* return list of midnights UTC between date1 and date2 */
function days_between(date1, date2) {
    var date2floor = new Date(date2);
    date2floor.setUTCMilliseconds(0);
    date2floor.setUTCSeconds(0);
    date2floor.setUTCMinutes(0);
    date2floor.setUTCHours(0);
    var ndays = Math.floor((date2floor - date1) / 24*3600000);
    if (ndays <= 0)
        return [];
    else {
        var res = [];
        for (i = date2floor; i > date1; i -= 24*3600000)
            res.push(new Date(i));
        res.reverse();
        return res;
    }
}
