/**
 * User: ngnono
 * Date: 15-1-27
 * Time: 下午4:11
 * To change this template use File | Settings | File Templates.
 */

'use strict';


var mkdirp = require('mkdirp');
var path = require('path');
var _ = require('lodash');
var fs = require('fs');

/**
 * func
 */
function noop() {
}


/**
 * 标准的 输出 CallBack fn
 * @param err
 * @param rst
 * @returns {*}
 */
function consoleStdCallback(err, rst) {
    if (err) {
        return console.error(err);
    }
    console.log(rst);
}


/**
 * 截取 字符串前缀
 * @param str
 * @param split ／
 * @returns {*}
 */
function getStringPrefix(str, split) {
    if (!str) {
        return '';
    }

    if (!split) {
        return str;
    }

    var i = str.indexOf(split);

    //var ss = str.split('/')[0];
    return str.substring(0, i);
}


exports.mkdir4sync = function (opts) {
    opts = opts || {};

    var path = '';
    var options = {};
    if (_.isString(opts)) {
        path = opts || '';
        options = {};
    } else {
        path = opts.path || '';
        options = opts.options || {};
    }

    //check
    if (path === '') {
        throw new Error("path is ''");
    }

    if (fs.existsSync(path)) {
        return true;
    }
    else {
        return mkdirp.sync(path, options);
    }
};

exports.getStringPrefix = getStringPrefix;
exports.consoleStdCallback = consoleStdCallback;
exports.noop = noop;
exports.datetimeFormat = 'YYYY-MM-DDTHH:mm:ssZ';