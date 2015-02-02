/**
 * User: ngnono
 * Date: 15-1-29
 * Time: 上午11:22
 * To change this template use File | Settings | File Templates.
 */

'use strict';

var request = require('request');
var mime = require('mime');


function getReSourceFn4Internet(fileInfo, callback) {

    var extname = fileInfo.extname;
    var fileFullName = fileInfo.name + '.' + extname;

    var fileUrlPrefix = fileInfo.prefix;
    var domain = fileInfo.domain;
    var ct = mime.lookup(fileFullName);
    var url = domain + fileUrlPrefix + fileFullName;

    var dstStream = fileInfo.dstStream;

    var response = {statusCode: 500};
    request
        .get(url, {
            headers: {
                'content-type': ct
            }
        })
        .on('error', function (err) {
            return callback(err);
        })
        .on('response', function (res) {
            response.statusCode = res.statusCode;
        })
        .on('end', function (res) {
            return callback(null, response);
        })
        .pipe(dstStream);
}

exports.fetch4internet = getReSourceFn4Internet;